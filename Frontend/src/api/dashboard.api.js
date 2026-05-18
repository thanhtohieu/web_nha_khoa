import axiosClient from '../utils/axiosClient';

const dashboardApi = {
  // Admin
  getAdminStats: () => axiosClient.get('/dashboard/admin/stats'),
  getAdminRevenueChart: (params) =>
    axiosClient.get('/dashboard/admin/revenue', { params }),
  getAdminAppointmentChart: (params) =>
    axiosClient.get('/dashboard/admin/appointments', { params }),
  getAdminTopDoctors: () => axiosClient.get('/dashboard/admin/top-doctors'),
  getAdminRecentActivities: () =>
    axiosClient.get('/dashboard/admin/recent-activities'),

  // Doctor
  getDoctorStats: () => axiosClient.get('/dashboard/doctor/stats'),
  getDoctorTodaySchedule: () =>
    axiosClient.get('/dashboard/doctor/today-schedule'),
  getDoctorPatientChart: (params) =>
    axiosClient.get('/dashboard/doctor/patients', { params }),
  getDoctorUpcomingAppointments: () =>
    axiosClient.get('/dashboard/doctor/upcoming-appointments'),

  // Receptionist
  getReceptionistStats: () =>
    axiosClient.get('/dashboard/receptionist/stats'),
  getReceptionistTodayAppointments: () =>
    axiosClient.get('/dashboard/receptionist/today-appointments'),
  getReceptionistPendingTasks: () =>
    axiosClient.get('/dashboard/receptionist/pending-tasks'),
  getReceptionistQueueStatus: () =>
    axiosClient.get('/dashboard/receptionist/queue'),

  // Patient
  getPatientStats: () => axiosClient.get('/dashboard/patient/stats'),
  getPatientUpcomingAppointments: () =>
    axiosClient.get('/dashboard/patient/upcoming-appointments'),
  getPatientMedicalHistory: () =>
    axiosClient.get('/dashboard/patient/medical-history'),
  getPatientPrescriptions: () =>
    axiosClient.get('/dashboard/patient/prescriptions'),
};

export default dashboardApi;
