const doctorRepository = require('./doctor.repository');
const userRepository = require('../user/user.repository');
const { AppError } = require('../../middlewares/error.middleware');
const { getPagination } = require('../../utils/helpers');
const { ROLES } = require('../../utils/constants');

const doctorService = {
  async getAllDoctors(query) {
    const { page, limit, offset } = getPagination(query);
    const { specialtyId, isAvailable, search, day } = query;

    return doctorRepository.findAll({
      page, limit, offset,
      specialtyId,
      isAvailable: typeof isAvailable !== 'undefined' ? isAvailable === 'true' : undefined,
      search,
      day,
    });
  },

  async getDoctorById(id) {
    const doctor = await doctorRepository.findById(id);
    if (!doctor) throw new AppError('Không tìm thấy bác sĩ', 404);
    return doctor;
  },

  async getDoctorByUserId(userId) {
    const doctor = await doctorRepository.findByUserId(userId);
    if (!doctor) throw new AppError('Không tìm thấy hồ sơ bác sĩ', 404);
    return doctor;
  },

  async createDoctorProfile(data) {
    const { userId, specialtyId, title, bio, experienceYears, education, certificate,
      consultationFee, workingDays, workingStart, workingEnd, slotDurationMinutes, maxPatientsPerDay } = data;

    // Kiểm tra user tồn tại và là doctor
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);
    if (user.role !== ROLES.DOCTOR) throw new AppError('Người dùng này không phải bác sĩ', 400);

    // Kiểm tra đã có profile chưa
    const existing = await doctorRepository.findByUserId(userId);
    if (existing) throw new AppError('Bác sĩ này đã có hồ sơ', 409);

    return doctorRepository.create({
      user_id: userId,
      specialty_id: specialtyId,
      title,
      bio,
      experience_years: experienceYears,
      education,
      certificate,
      consultation_fee: consultationFee,
      working_days: workingDays || [],
      working_start: workingStart || '08:00',
      working_end: workingEnd || '17:00',
      slot_duration_minutes: slotDurationMinutes || 30,
      max_patients_per_day: maxPatientsPerDay,
      is_available: true,
    });
  },

  async updateDoctorProfile(id, data, requestUser) {
    const doctor = await doctorRepository.findById(id);
    if (!doctor) throw new AppError('Không tìm thấy hồ sơ bác sĩ', 404);

    // Doctor chỉ được sửa profile của chính mình
    if (requestUser.role === ROLES.DOCTOR && doctor.user_id !== requestUser.id) {
      throw new AppError('Bạn không có quyền sửa hồ sơ này', 403);
    }

    const { specialtyId, title, bio, experienceYears, education, certificate,
      consultationFee, workingDays, workingStart, workingEnd, slotDurationMinutes, maxPatientsPerDay } = data;

    return doctorRepository.update(id, {
      specialty_id: specialtyId,
      title,
      bio,
      experience_years: experienceYears,
      education,
      certificate,
      consultation_fee: consultationFee,
      working_days: workingDays,
      working_start: workingStart,
      working_end: workingEnd,
      slot_duration_minutes: slotDurationMinutes,
      max_patients_per_day: maxPatientsPerDay,
    });
  },

  // Bác sĩ tự cập nhật profile của mình
  async updateMyProfile(userId, data) {
    const doctor = await doctorRepository.findByUserId(userId);
    if (!doctor) throw new AppError('Không tìm thấy hồ sơ bác sĩ', 404);

    const { title, bio, experienceYears, education, certificate,
      consultationFee, workingDays, workingStart, workingEnd, slotDurationMinutes, maxPatientsPerDay } = data;

    return doctorRepository.updateByUserId(userId, {
      title,
      bio,
      experience_years: experienceYears,
      education,
      certificate,
      consultation_fee: consultationFee,
      working_days: workingDays,
      working_start: workingStart,
      working_end: workingEnd,
      slot_duration_minutes: slotDurationMinutes,
      max_patients_per_day: maxPatientsPerDay,
    });
  },

  async toggleAvailability(id) {
    const doctor = await doctorRepository.findById(id);
    if (!doctor) throw new AppError('Không tìm thấy bác sĩ', 404);
    return doctorRepository.update(id, { is_available: !doctor.is_available });
  },

  async getAvailableSlots(doctorProfileId, date) {
    if (!date) throw new AppError('Vui lòng cung cấp ngày khám', 400);

    const dayjs = require('dayjs');
    const today = dayjs().startOf('day');
    const targetDate = dayjs(date).startOf('day');
    if (targetDate.isBefore(today)) {
      throw new AppError('Không thể xem lịch trong quá khứ', 400);
    }

    const slots = await doctorRepository.getAvailableSlots(doctorProfileId, date);
    if (slots === null) throw new AppError('Không tìm thấy bác sĩ', 404);

    return slots;
  },
};

module.exports = doctorService;
