import axiosClient from './axiosClient';

const doctorApi = {
  // ── Public ────────────────────────────────────────────────────────────────
  /** GET /doctors?page&limit&search&specialty&status */
  getDoctors: (params) => axiosClient.get('/doctors', { params }),

  /** GET /doctors/:id */
  getDoctorById: (id) => axiosClient.get(`/doctors/${id}`),

  /** GET /doctors/:id/slots?date=YYYY-MM-DD */
  getDoctorSlots: (id, date) =>
    axiosClient.get(`/doctors/${id}/slots`, { params: { date } }),

  /** GET /doctors/specialties  – for filter dropdown */
  getSpecialties: () => axiosClient.get('/doctors/specialties'),

  // ── Doctor (own profile) ──────────────────────────────────────────────────
  /** GET /doctors/me */
  getMyProfile: () => axiosClient.get('/doctors/me'),

  /** PUT /doctors/me */
  updateMyProfile: (data) => axiosClient.put('/doctors/me', data),

  /** PUT /doctors/me/avatar */
  updateAvatar: (formData) =>
    axiosClient.put('/doctors/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // ── Schedule ──────────────────────────────────────────────────────────────
  /** GET /doctors/me/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD */
  getMySchedule: (from, to) =>
    axiosClient.get('/doctors/me/schedule', { params: { from, to } }),

  /** POST /doctors/me/schedule  – add / update slots for a day */
  upsertSchedule: (data) => axiosClient.post('/doctors/me/schedule', data),

  /** DELETE /doctors/me/schedule/:slotId */
  deleteSlot: (slotId) => axiosClient.delete(`/doctors/me/schedule/${slotId}`),

  // ── Admin ─────────────────────────────────────────────────────────────────
  /** GET /admin/doctors/:id/schedule?from&to */
  getScheduleByDoctorId: (id, from, to) =>
    axiosClient.get(`/admin/doctors/${id}/schedule`, { params: { from, to } }),
};

export default doctorApi;
