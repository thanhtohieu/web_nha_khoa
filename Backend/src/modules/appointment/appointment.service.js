const dayjs = require('dayjs');
const appointmentRepository = require('./appointment.repository');
const doctorRepository = require('../doctor/doctor.repository');
const userRepository = require('../user/user.repository');
const { AppError } = require('../../middlewares/error.middleware');
const { getPagination, generateBookingCode, isInWorkingHours } = require('../../utils/helpers');
const { APPOINTMENT_STATUS, PAYMENT_STATUS, ROLES, NOTIFICATION_TYPE } = require('../../utils/constants');
const logger = require('../../utils/logger');

const appointmentService = {
  // --------------------
  // ĐẶT LỊCH KHÁM
  // --------------------
  async book(data, requestUser) {
    const { doctorProfileId, serviceId, appointmentDate, appointmentTime, reason, patientId } = data;

    // Xác định bệnh nhân: receptionist/admin có thể đặt cho người khác
    let finalPatientId = requestUser.id;
    if (patientId && [ROLES.ADMIN, ROLES.RECEPTIONIST].includes(requestUser.role)) {
      finalPatientId = patientId;
    }

    // 1. Kiểm tra bác sĩ tồn tại & đang nhận bệnh
    const doctor = await doctorRepository.findById(doctorProfileId);
    if (!doctor) throw new AppError('Không tìm thấy bác sĩ', 404);
    if (!doctor.is_available) throw new AppError('Bác sĩ hiện không nhận lịch hẹn', 400);

    // 2. Kiểm tra ngày hợp lệ (không được đặt quá khứ)
    const today = dayjs().startOf('day');
    const targetDate = dayjs(appointmentDate).startOf('day');
    if (targetDate.isBefore(today)) {
      throw new AppError('Không thể đặt lịch trong quá khứ', 400);
    }

    // 3. Kiểm tra ngày làm việc của bác sĩ
    const dayOfWeek = targetDate.format('dddd').toLowerCase();
    if (!doctor.working_days.includes(dayOfWeek)) {
      throw new AppError(`Bác sĩ không làm việc vào ${dayOfWeek}`, 400);
    }

    // 4. Kiểm tra giờ làm việc
    if (!isInWorkingHours(appointmentTime, doctor.working_start, doctor.working_end)) {
      throw new AppError(`Giờ khám phải trong khoảng ${doctor.working_start} - ${doctor.working_end}`, 400);
    }

    // 5. Kiểm tra slot chưa bị đặt
    const conflict = await appointmentRepository.checkSlotConflict(doctorProfileId, appointmentDate, appointmentTime);
    if (conflict) throw new AppError('Khung giờ này đã có người đặt, vui lòng chọn giờ khác', 409);

    // 6. Kiểm tra giới hạn bệnh nhân/ngày
    if (doctor.max_patients_per_day) {
      const count = await appointmentRepository.countByDoctorAndDate(doctorProfileId, appointmentDate);
      if (count >= doctor.max_patients_per_day) {
        throw new AppError('Bác sĩ đã đủ lịch trong ngày này', 400);
      }
    }

    // 7. Tạo số thứ tự
    const maxQueue = await appointmentRepository.getMaxQueueNumber(doctorProfileId, appointmentDate);
    const queueNumber = maxQueue + 1;

    const appointment = await appointmentRepository.create({
      booking_code: generateBookingCode(),
      patient_id: finalPatientId,
      doctor_profile_id: doctorProfileId,
      service_id: serviceId || null,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      reason,
      queue_number: queueNumber,
      status: APPOINTMENT_STATUS.PENDING,
      payment_status: PAYMENT_STATUS.PENDING,
    });

    // Gửi notification (non-blocking)
    this._sendBookingNotification(appointment).catch((e) =>
      logger.warn('Gửi notification đặt lịch thất bại:', e.message)
    );

    return appointment;
  },

  // --------------------
  // XÁC NHẬN LỊCH (Lễ tân / Admin)
  // --------------------
  async confirm(id, notes) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new AppError('Không tìm thấy lịch hẹn', 404);
    if (appointment.status !== APPOINTMENT_STATUS.PENDING) {
      throw new AppError(`Lịch hẹn đang ở trạng thái "${appointment.status}", không thể xác nhận`, 400);
    }

    return appointmentRepository.update(id, {
      status: APPOINTMENT_STATUS.CONFIRMED,
      notes,
    });
  },

  // --------------------
  // CHECK-IN (Lễ tân)
  // --------------------
  async checkIn(id) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new AppError('Không tìm thấy lịch hẹn', 404);
    if (appointment.status !== APPOINTMENT_STATUS.CONFIRMED) {
      throw new AppError('Chỉ xác nhận check-in cho lịch đã được duyệt', 400);
    }

    return appointmentRepository.update(id, {
      status: APPOINTMENT_STATUS.CHECKED_IN,
      checked_in_at: new Date(),
    });
  },

  // --------------------
  // HOÀN THÀNH (Bác sĩ / Admin)
  // --------------------
  async complete(id, notes) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new AppError('Không tìm thấy lịch hẹn', 404);

    const allowedStatuses = [APPOINTMENT_STATUS.CHECKED_IN, APPOINTMENT_STATUS.IN_PROGRESS];
    if (!allowedStatuses.includes(appointment.status)) {
      throw new AppError('Trạng thái lịch hẹn không hợp lệ để hoàn thành', 400);
    }

    return appointmentRepository.update(id, {
      status: APPOINTMENT_STATUS.COMPLETED,
      completed_at: new Date(),
      notes: notes || appointment.notes,
    });
  },

  // --------------------
  // HỦY LỊCH
  // --------------------
  async cancel(id, { reason, cancelledBy }) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new AppError('Không tìm thấy lịch hẹn', 404);

    const cancellableStatuses = [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED];
    if (!cancellableStatuses.includes(appointment.status)) {
      throw new AppError('Không thể hủy lịch hẹn ở trạng thái hiện tại', 400);
    }

    // Bệnh nhân chỉ hủy được trong vòng 2 giờ trước giờ hẹn
    const user = await userRepository.findById(cancelledBy);
    if (user?.role === ROLES.PATIENT) {
      const appointmentDateTime = dayjs(`${appointment.appointment_date} ${appointment.appointment_time}`);
      const hoursUntil = appointmentDateTime.diff(dayjs(), 'hour');
      if (hoursUntil < 2) {
        throw new AppError('Chỉ được hủy lịch trước ít nhất 2 giờ so với giờ hẹn', 400);
      }
    }

    return appointmentRepository.update(id, {
      status: APPOINTMENT_STATUS.CANCELLED,
      cancellation_reason: reason,
      cancelled_by: cancelledBy,
      cancelled_at: new Date(),
    });
  },

  // --------------------
  // ĐÁNH DẤU KHÔNG ĐẾN
  // --------------------
  async markNoShow(id) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new AppError('Không tìm thấy lịch hẹn', 404);
    if (appointment.status !== APPOINTMENT_STATUS.CONFIRMED) {
      throw new AppError('Chỉ đánh dấu no-show cho lịch đã xác nhận', 400);
    }
    return appointmentRepository.update(id, { status: APPOINTMENT_STATUS.NO_SHOW });
  },

  // --------------------
  // LẤY DANH SÁCH
  // --------------------
  async getAll(query, requestUser) {
    const { page, limit, offset } = getPagination(query);
    const filters = { ...query, page, limit, offset };

    // Lọc theo role
    if (requestUser.role === ROLES.PATIENT) {
      filters.patientId = requestUser.id;
    } else if (requestUser.role === ROLES.DOCTOR) {
      const doctor = await doctorRepository.findByUserId(requestUser.id);
      if (doctor) filters.doctorProfileId = doctor.id;
    }

    return appointmentRepository.findAll(filters);
  },

  async getById(id, requestUser) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new AppError('Không tìm thấy lịch hẹn', 404);

    // Bệnh nhân chỉ xem được lịch của mình
    if (requestUser.role === ROLES.PATIENT && appointment.patient_id !== requestUser.id) {
      throw new AppError('Bạn không có quyền xem lịch hẹn này', 403);
    }

    return appointment;
  },

  async getByBookingCode(code) {
    const appointment = await appointmentRepository.findByBookingCode(code);
    if (!appointment) throw new AppError('Không tìm thấy lịch hẹn với mã này', 404);
    return appointment;
  },

  // --------------------
  // PRIVATE: Gửi notification
  // --------------------
  async _sendBookingNotification(appointment) {
    // Sẽ dùng notificationService ở Phase 4
    // Placeholder để không throw error
  },
};

module.exports = appointmentService;
