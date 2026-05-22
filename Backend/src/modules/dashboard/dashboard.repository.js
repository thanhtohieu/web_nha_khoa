const { Op, literal, fn, col } = require('sequelize');
const { sequelize } = require('../../config/database');
const User = require('../user/user.model');
const DoctorProfile = require('../doctor/doctor.model');
const Appointment = require('../appointment/appointment.model');
const Payment = require('../payment/payment.model');
const Review = require('../review/review.model');
const Specialty = require('../service/specialty.model');
const Service = require('../service/service.model');
const { MedicalRecord } = require('../medical/medical.model');
const { APPOINTMENT_STATUS, PAYMENT_STATUS, ROLES } = require('../../utils/constants');
const dayjs = require('dayjs');

const dashboardRepository = {
  // ========================
  // ADMIN STATS
  // ========================
  async getAdminOverview({ startDate, endDate }) {
    const dateFilter = {
      [Op.between]: [new Date(startDate), new Date(endDate)],
    };

    const [
      totalUsers,
      newPatients,
      totalDoctors,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      totalRevenue,
      pendingAppointments,
      avgRating,
    ] = await Promise.all([
      User.count({ where: { is_active: true } }),

      User.count({
        where: { role: ROLES.PATIENT, created_at: dateFilter },
      }),

      DoctorProfile.count({ where: { is_available: true } }),

      Appointment.count({
        where: { appointment_date: { [Op.between]: [startDate, endDate] } },
      }),

      Appointment.count({
        where: {
          appointment_date: { [Op.between]: [startDate, endDate] },
          status: APPOINTMENT_STATUS.COMPLETED,
        },
      }),

      Appointment.count({
        where: {
          appointment_date: { [Op.between]: [startDate, endDate] },
          status: APPOINTMENT_STATUS.CANCELLED,
        },
      }),

      Payment.sum('amount', {
        where: {
          status: PAYMENT_STATUS.PAID,
          paid_at: dateFilter,
        },
      }),

      Appointment.count({
        where: { status: APPOINTMENT_STATUS.PENDING },
      }),

      Review.findOne({
        where: { is_visible: true },
        attributes: [[fn('AVG', col('rating')), 'avg']],
        raw: true,
      }),
    ]);

    return {
      totalUsers,
      newPatients,
      totalDoctors,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      pendingAppointments,
      totalRevenue: parseFloat(totalRevenue || 0),
      completionRate: totalAppointments > 0
        ? parseFloat(((completedAppointments / totalAppointments) * 100).toFixed(1))
        : 0,
      avgRating: parseFloat(parseFloat(avgRating?.avg || 0).toFixed(2)),
    };
  },

  // Doanh thu theo ngày/tháng
  async getRevenueChart({ startDate, endDate, groupBy = 'day' }) {
    const dateFormat = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';

    const results = await Payment.findAll({
      where: {
        status: PAYMENT_STATUS.PAID,
        paid_at: { [Op.between]: [new Date(startDate), new Date(endDate)] },
      },
      attributes: [
        [fn('DATE_FORMAT', col('paid_at'), dateFormat), 'period'],
        [fn('SUM', col('amount')), 'revenue'],
        [fn('COUNT', col('id')), 'count'],
      ],
      group: [literal(`DATE_FORMAT(paid_at, '${dateFormat}')`)],
      order: [[literal(`DATE_FORMAT(paid_at, '${dateFormat}')`), 'ASC']],
      raw: true,
    });

    return results.map((r) => ({
      period: r.period,
      revenue: parseFloat(r.revenue || 0),
      count: parseInt(r.count || 0),
    }));
  },

  // Lịch hẹn theo ngày trong tuần/tháng
  async getAppointmentChart({ startDate, endDate }) {
    const results = await Appointment.findAll({
      where: {
        appointment_date: { [Op.between]: [startDate, endDate] },
      },
      attributes: [
        ['appointment_date', 'date'],
        ['status', 'status'],
        [fn('COUNT', col('id')), 'count'],
      ],
      group: ['appointment_date', 'status'],
      order: [['appointment_date', 'ASC']],
      raw: true,
    });

    return results;
  },

  // Top bác sĩ theo số lịch hẹn hoàn thành
  async getTopDoctors({ startDate, endDate, limit = 5 }) {
    const results = await Appointment.findAll({
      where: {
        appointment_date: { [Op.between]: [startDate, endDate] },
        status: APPOINTMENT_STATUS.COMPLETED,
      },
      attributes: [
        'doctor_profile_id',
        [fn('COUNT', col('Appointment.id')), 'total_appointments'],
        [fn('SUM', col('payment.amount')), 'total_revenue'],
      ],
      include: [
        {
          model: DoctorProfile,
          as: 'doctor',
          attributes: ['id', 'title', 'rating_avg', 'rating_count'],
          include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'avatar'] }],
        },
        {
          model: Payment,
          as: 'payment',
          attributes: [],
          where: { status: PAYMENT_STATUS.PAID },
          required: false,
        },
      ],
      group: [
        'doctor_profile_id',
        'doctor.id', 'doctor.title', 'doctor.rating_avg', 'doctor.rating_count',
        'doctor->user.id', 'doctor->user.full_name', 'doctor->user.avatar',
      ],
      order: [[literal('total_appointments'), 'DESC']],
      limit,
    });

    return results;
  },

  // Phân bổ bệnh nhân theo chuyên khoa
  async getSpecialtyDistribution({ startDate, endDate }) {
    const Specialty = require('../service/specialty.model');

    const results = await Appointment.findAll({
      where: {
        appointment_date: { [Op.between]: [startDate, endDate] },
        status: { [Op.ne]: APPOINTMENT_STATUS.CANCELLED },
      },
      attributes: [[fn('COUNT', col('Appointment.id')), 'count']],
      include: [
        {
          model: DoctorProfile,
          as: 'doctor',
          attributes: [],
          include: [{ model: Specialty, as: 'specialty', attributes: ['id', 'name', 'icon'] }],
        },
      ],
      group: ['doctor->specialty.id', 'doctor->specialty.name', 'doctor->specialty.icon'],
      raw: false,
    });

    return results;
  },

  // Lịch hẹn mới nhất (recent)
  async getRecentAppointments(limit = 10) {
    return Appointment.findAll({
      include: [
        { model: User, as: 'patient', attributes: ['id', 'full_name', 'avatar', 'phone'] },
        {
          model: DoctorProfile,
          as: 'doctor',
          attributes: ['id', 'title'],
          include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
    });
  },

  // ========================
  // DOCTOR STATS
  // ========================
  async getDoctorStats(doctorProfileId, { startDate, endDate }) {
    const dateFilter = { [Op.between]: [startDate, endDate] };

    const [
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      pendingAppointments,
      totalPatients,
      totalRevenue,
      avgRating,
      todayAppointments,
    ] = await Promise.all([
      Appointment.count({
        where: { doctor_profile_id: doctorProfileId, appointment_date: dateFilter },
      }),

      Appointment.count({
        where: {
          doctor_profile_id: doctorProfileId,
          appointment_date: dateFilter,
          status: APPOINTMENT_STATUS.COMPLETED,
        },
      }),

      Appointment.count({
        where: {
          doctor_profile_id: doctorProfileId,
          appointment_date: dateFilter,
          status: APPOINTMENT_STATUS.CANCELLED,
        },
      }),

      Appointment.count({
        where: {
          doctor_profile_id: doctorProfileId,
          status: APPOINTMENT_STATUS.PENDING,
        },
      }),

      Appointment.count({
        where: {
          doctor_profile_id: doctorProfileId,
          appointment_date: dateFilter,
          status: APPOINTMENT_STATUS.COMPLETED,
        },
        distinct: true,
        col: 'patient_id',
      }),

      Payment.sum('amount', {
        where: {
          status: PAYMENT_STATUS.PAID,
          paid_at: { [Op.between]: [new Date(startDate), new Date(endDate)] },
        },
        include: [{
          model: Appointment,
          as: 'appointment',
          where: { doctor_profile_id: doctorProfileId },
          attributes: [],
        }],
      }),

      Review.findOne({
        where: { doctor_profile_id: doctorProfileId, is_visible: true },
        attributes: [
          [fn('AVG', col('rating')), 'avg'],
          [fn('COUNT', col('id')), 'count'],
        ],
        raw: true,
      }),

      Appointment.findAll({
        where: {
          doctor_profile_id: doctorProfileId,
          appointment_date: dayjs().format('YYYY-MM-DD'),
          status: {
            [Op.notIn]: [APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW],
          },
        },
        include: [
          { model: User, as: 'patient', attributes: ['id', 'full_name', 'phone', 'avatar'] },
        ],
        order: [['appointment_time', 'ASC']],
      }),
    ]);

    return {
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      pendingAppointments,
      totalPatients,
      totalRevenue: parseFloat(totalRevenue || 0),
      avgRating: parseFloat(parseFloat(avgRating?.avg || 0).toFixed(2)),
      ratingCount: parseInt(avgRating?.count || 0),
      completionRate: totalAppointments > 0
        ? parseFloat(((completedAppointments / totalAppointments) * 100).toFixed(1))
        : 0,
      todayAppointments,
    };
  },

  // ========================
  // RECEPTIONIST STATS
  // ========================
  async getReceptionistStats() {
    const today = dayjs().format('YYYY-MM-DD');

    const [
      todayTotal,
      todayPending,
      todayConfirmed,
      todayCheckedIn,
      todayCompleted,
      todayCancelled,
      pendingTotal,
      recentAppointments,
    ] = await Promise.all([
      Appointment.count({ where: { appointment_date: today } }),
      Appointment.count({ where: { appointment_date: today, status: APPOINTMENT_STATUS.PENDING } }),
      Appointment.count({ where: { appointment_date: today, status: APPOINTMENT_STATUS.CONFIRMED } }),
      Appointment.count({ where: { appointment_date: today, status: APPOINTMENT_STATUS.CHECKED_IN } }),
      Appointment.count({ where: { appointment_date: today, status: APPOINTMENT_STATUS.COMPLETED } }),
      Appointment.count({ where: { appointment_date: today, status: APPOINTMENT_STATUS.CANCELLED } }),
      Appointment.count({ where: { status: APPOINTMENT_STATUS.PENDING } }),

      Appointment.findAll({
        where: {
          appointment_date: today,
          status: {
            [Op.in]: [
              APPOINTMENT_STATUS.PENDING,
              APPOINTMENT_STATUS.CONFIRMED,
              APPOINTMENT_STATUS.CHECKED_IN,
            ],
          },
        },
        include: [
          { model: User, as: 'patient', attributes: ['id', 'full_name', 'phone', 'avatar'] },
          {
            model: DoctorProfile,
            as: 'doctor',
            attributes: ['id'],
            include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }],
          },
        ],
        order: [['appointment_time', 'ASC']],
        limit: 20,
      }),
    ]);

    return {
      today: {
        total: todayTotal,
        pending: todayPending,
        confirmed: todayConfirmed,
        checkedIn: todayCheckedIn,
        completed: todayCompleted,
        cancelled: todayCancelled,
      },
      pendingTotal,
      recentAppointments,
    };
  },

  // ========================
  // PATIENT STATS
  // ========================
  async getPatientStats(patientId) {
    const [
      totalAppointments,
      completedAppointments,
      upcomingAppointments,
      totalSpent,
      upcomingList,
    ] = await Promise.all([
      Appointment.count({ where: { patient_id: patientId } }),

      Appointment.count({
        where: { patient_id: patientId, status: APPOINTMENT_STATUS.COMPLETED },
      }),

      Appointment.count({
        where: {
          patient_id: patientId,
          appointment_date: { [Op.gte]: dayjs().format('YYYY-MM-DD') },
          status: {
            [Op.in]: [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED],
          },
        },
      }),

      Payment.sum('amount', {
        where: { user_id: patientId, status: PAYMENT_STATUS.PAID },
      }),

      Appointment.findAll({
        where: {
          patient_id: patientId,
          appointment_date: { [Op.gte]: dayjs().format('YYYY-MM-DD') },
          status: {
            [Op.in]: [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED],
          },
        },
        include: [
          {
            model: DoctorProfile,
            as: 'doctor',
            attributes: ['id', 'title', 'consultation_fee'],
            include: [
              { model: User, as: 'user', attributes: ['id', 'full_name', 'avatar'] },
              { model: Specialty, as: 'specialty', attributes: ['id', 'name'] },
            ],
          },
          { model: Service, as: 'service', attributes: ['id', 'name'] },
        ],
        order: [['appointment_date', 'ASC'], ['appointment_time', 'ASC']],
        limit: 5,
      }),
    ]);

    return {
      totalAppointments,
      completedAppointments,
      upcomingAppointments,
      totalSpent: parseFloat(totalSpent || 0),
      upcomingList,
    };
  },
};

module.exports = dashboardRepository;
