import { create } from 'zustand';
import appointmentApi from '../api/appointment.api';

const useappointment.store = create((set, get) => ({
  // List
  appointments: [],
  listLoading: false,
  listError: null,
  listFilters: { status: '', role: '', page: 1, limit: 10 },
  pagination: { total: 0, page: 1, totalPages: 1 },

  // Detail
  currentAppointment: null,
  detailLoading: false,
  detailError: null,

  // Booking
  doctors: [],
  doctorsLoading: false,
  slots: [],
  slotsLoading: false,
  bookingLoading: false,
  bookingError: null,

  // Actions
  setListFilters: (filters) =>
    set((s) => ({ listFilters: { ...s.listFilters, ...filters, page: 1 } })),

  fetchAppointments: async () => {
    set({ listLoading: true, listError: null });
    try {
      const res = await appointmentApi.getAppointments(get().listFilters);
      set({
        appointments: res.data || res,
        pagination: res.pagination || { total: res.length, page: 1, totalPages: 1 },
        listLoading: false,
      });
    } catch (err) {
      set({ listLoading: false, listError: err.message || 'Không thể tải danh sách lịch hẹn' });
    }
  },

  fetchAppointmentById: async (id) => {
    set({ detailLoading: true, detailError: null });
    try {
      const res = await appointmentApi.getAppointmentById(id);
      set({ currentAppointment: res.data || res, detailLoading: false });
    } catch (err) {
      set({ detailLoading: false, detailError: err.message || 'Không thể tải thông tin lịch hẹn' });
    }
  },

  fetchDoctors: async (params) => {
    set({ doctorsLoading: true });
    try {
      const res = await appointmentApi.getDoctors(params);
      set({ doctors: res.data || res, doctorsLoading: false });
    } catch {
      set({ doctorsLoading: false });
    }
  },

  fetchSlots: async (doctorId, date) => {
    set({ slotsLoading: true, slots: [] });
    try {
      const res = await appointmentApi.getDoctorSlots(doctorId, date);
      set({ slots: res.data || res, slotsLoading: false });
    } catch {
      set({ slotsLoading: false });
    }
  },

  createAppointment: async (payload) => {
    set({ bookingLoading: true, bookingError: null });
    try {
      const res = await appointmentApi.createAppointment(payload);
      set({ bookingLoading: false });
      return { success: true, data: res.data || res };
    } catch (err) {
      set({ bookingLoading: false, bookingError: err.message || 'Đặt lịch thất bại' });
      return { success: false, error: err.message };
    }
  },

  performAction: async (action, id, extra = {}) => {
    set({ detailLoading: true });
    try {
      let res;
      switch (action) {
        case 'confirm': res = await appointmentApi.confirmAppointment(id); break;
        case 'cancel': res = await appointmentApi.cancelAppointment(id, extra.reason); break;
        case 'checkin': res = await appointmentApi.checkInAppointment(id); break;
        case 'complete': res = await appointmentApi.completeAppointment(id, extra.notes); break;
        default: throw new Error('Unknown action');
      }
      set({ currentAppointment: res.data || res, detailLoading: false });
      return { success: true };
    } catch (err) {
      set({ detailLoading: false });
      return { success: false, error: err.message };
    }
  },

  clearBookingError: () => set({ bookingError: null }),
  clearDetail: () => set({ currentAppointment: null, detailError: null }),
}));

export default useappointment.store;
