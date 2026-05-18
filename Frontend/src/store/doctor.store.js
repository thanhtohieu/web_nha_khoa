import { create } from 'zustand';
import doctorApi from '../api/doctor.api';

const useDoctorStore = create((set, get) => ({
  // ── Public list ───────────────────────────────────────────────────────────
  doctors: [],
  doctorTotal: 0,
  doctorPage: 1,
  doctorLimit: 12,
  specialties: [],
  listLoading: false,
  listError: null,

  fetchDoctors: async (params = {}) => {
    set({ listLoading: true, listError: null });
    try {
      const { page = 1, limit = 12, search = '', specialty = '', status = '' } = params;
      const res = await doctorApi.getDoctors({ page, limit, search, specialty, status });
      set({
        doctors: res.data.items ?? res.data.data ?? res.data,
        doctorTotal: res.data.total ?? 0,
        doctorPage: page,
        doctorLimit: limit,
        listLoading: false,
      });
    } catch (err) {
      set({ listError: err.response?.data?.message ?? 'Không thể tải danh sách bác sĩ.', listLoading: false });
    }
  },

  fetchSpecialties: async () => {
    try {
      const res = await doctorApi.getSpecialties();
      set({ specialties: res.data ?? [] });
    } catch (_) {}
  },

  clearListError: () => set({ listError: null }),

  // ── Public detail + slots ─────────────────────────────────────────────────
  selectedDoctor: null,
  selectedDoctorLoading: false,
  selectedDoctorError: null,

  slots: [],            // available slots for a given date
  slotsLoading: false,
  slotsDate: null,

  fetchDoctorById: async (id) => {
    set({ selectedDoctorLoading: true, selectedDoctorError: null, selectedDoctor: null });
    try {
      const res = await doctorApi.getDoctorById(id);
      set({ selectedDoctor: res.data, selectedDoctorLoading: false });
    } catch (err) {
      set({
        selectedDoctorError: err.response?.data?.message ?? 'Không thể tải thông tin bác sĩ.',
        selectedDoctorLoading: false,
      });
    }
  },

  fetchSlots: async (doctorId, date) => {
    set({ slotsLoading: true, slotsDate: date, slots: [] });
    try {
      const res = await doctorApi.getDoctorSlots(doctorId, date);
      set({ slots: res.data ?? [], slotsLoading: false });
    } catch (_) {
      set({ slots: [], slotsLoading: false });
    }
  },

  clearSelectedDoctor: () =>
    set({ selectedDoctor: null, selectedDoctorError: null, slots: [], slotsDate: null }),

  // ── Doctor own profile ────────────────────────────────────────────────────
  myProfile: null,
  myProfileLoading: false,
  myProfileError: null,

  fetchMyProfile: async () => {
    set({ myProfileLoading: true, myProfileError: null });
    try {
      const res = await doctorApi.getMyProfile();
      set({ myProfile: res.data, myProfileLoading: false });
    } catch (err) {
      set({
        myProfileError: err.response?.data?.message ?? 'Không thể tải hồ sơ.',
        myProfileLoading: false,
      });
    }
  },

  updateMyProfile: async (data) => {
    set({ myProfileLoading: true, myProfileError: null });
    try {
      const res = await doctorApi.updateMyProfile(data);
      set({ myProfile: res.data, myProfileLoading: false });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message ?? 'Cập nhật thất bại.';
      set({ myProfileError: message, myProfileLoading: false });
      return { success: false, message };
    }
  },

  clearMyProfileError: () => set({ myProfileError: null }),

  // ── Schedule ──────────────────────────────────────────────────────────────
  schedule: [],         // array of { date, slots: [] }
  scheduleLoading: false,
  scheduleError: null,
  scheduleRange: { from: null, to: null },

  fetchMySchedule: async (from, to) => {
    set({ scheduleLoading: true, scheduleError: null, scheduleRange: { from, to } });
    try {
      const res = await doctorApi.getMySchedule(from, to);
      set({ schedule: res.data ?? [], scheduleLoading: false });
    } catch (err) {
      set({
        scheduleError: err.response?.data?.message ?? 'Không thể tải lịch làm việc.',
        scheduleLoading: false,
      });
    }
  },

  upsertSchedule: async (data) => {
    try {
      const res = await doctorApi.upsertSchedule(data);
      // Merge returned slots into local schedule
      set((state) => {
        const updated = res.data; // { date, slots }
        const exists = state.schedule.find((s) => s.date === updated.date);
        return {
          schedule: exists
            ? state.schedule.map((s) => (s.date === updated.date ? updated : s))
            : [...state.schedule, updated],
        };
      });
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message ?? 'Lưu lịch thất bại.' };
    }
  },

  deleteSlot: async (slotId, date) => {
    try {
      await doctorApi.deleteSlot(slotId);
      set((state) => ({
        schedule: state.schedule.map((s) =>
          s.date === date
            ? { ...s, slots: s.slots.filter((sl) => sl.id !== slotId) }
            : s
        ),
      }));
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message ?? 'Xoá slot thất bại.' };
    }
  },

  clearScheduleError: () => set({ scheduleError: null }),
}));

export default useDoctorStore;
