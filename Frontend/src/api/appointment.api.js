import axiosClient from './axiosClient';

const appointmentApi = {
  // Doctors
  getDoctors: (params = {}) =>
    axiosClient.get('/doctors', { params }),

  getDoctorSlots: (doctorId, date) =>
    axiosClient.get(`/doctors/${doctorId}/slots`, { params: { date } }),

  // Appointments
  getAppointments: (params = {}) =>
    axiosClient.get('/appointments', { params }),

  getAppointmentById: (id) =>
    axiosClient.get(`/appointments/${id}`),

  createAppointment: (payload) =>
    axiosClient.post('/appointments', payload),

  confirmAppointment: (id) =>
    axiosClient.patch(`/appointments/${id}/confirm`),

  cancelAppointment: (id, reason) =>
    axiosClient.patch(`/appointments/${id}/cancel`, { reason }),

  checkInAppointment: (id) =>
    axiosClient.patch(`/appointments/${id}/check-in`),

  completeAppointment: (id, notes) =>
    axiosClient.patch(`/appointments/${id}/complete`, { notes }),
};

export default appointmentApi;
