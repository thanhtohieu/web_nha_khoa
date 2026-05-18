import { create } from 'zustand';
import userApi from '../api/user.api';

const useUserStore = create((set, get) => ({
  // ── Profile state ─────────────────────────────────────────────────────────
  profile: null,
  profileLoading: false,
  profileError: null,

  fetchProfile: async () => {
    set({ profileLoading: true, profileError: null });
    try {
      const res = await userApi.getProfile();
      set({ profile: res.data, profileLoading: false });
    } catch (err) {
      set({
        profileError: err.response?.data?.message ?? 'Không thể tải hồ sơ.',
        profileLoading: false,
      });
    }
  },

  updateProfile: async (data) => {
    set({ profileLoading: true, profileError: null });
    try {
      const res = await userApi.updateProfile(data);
      set({ profile: res.data, profileLoading: false });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message ?? 'Cập nhật thất bại.';
      set({ profileError: message, profileLoading: false });
      return { success: false, message };
    }
  },

  clearProfileError: () => set({ profileError: null }),

  // ── User list state ───────────────────────────────────────────────────────
  users: [],
  userTotal: 0,
  userPage: 1,
  userLimit: 10,
  usersLoading: false,
  usersError: null,

  fetchUsers: async (params = {}) => {
    set({ usersLoading: true, usersError: null });
    try {
      const { page = 1, limit = 10, search = '', role = '', status = '' } = params;
      const res = await userApi.getUsers({ page, limit, search, role, status });
      set({
        users: res.data.items ?? res.data.data ?? res.data,
        userTotal: res.data.total ?? 0,
        userPage: page,
        userLimit: limit,
        usersLoading: false,
      });
    } catch (err) {
      set({
        usersError: err.response?.data?.message ?? 'Không thể tải danh sách người dùng.',
        usersLoading: false,
      });
    }
  },

  toggleUserStatus: async (id) => {
    try {
      await userApi.toggleUserStatus(id);
      set((state) => ({
        users: state.users.map((u) =>
          u.id === id
            ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' }
            : u
        ),
      }));
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message ?? 'Thao tác thất bại.' };
    }
  },

  deleteUser: async (id) => {
    try {
      await userApi.deleteUser(id);
      set((state) => ({
        users: state.users.filter((u) => u.id !== id),
        userTotal: state.userTotal - 1,
      }));
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message ?? 'Xoá thất bại.' };
    }
  },

  clearUsersError: () => set({ usersError: null }),

  // ── User detail state ─────────────────────────────────────────────────────
  selectedUser: null,
  selectedUserLoading: false,
  selectedUserError: null,

  fetchUserById: async (id) => {
    set({ selectedUserLoading: true, selectedUserError: null, selectedUser: null });
    try {
      const res = await userApi.getUserById(id);
      set({ selectedUser: res.data, selectedUserLoading: false });
    } catch (err) {
      set({
        selectedUserError: err.response?.data?.message ?? 'Không thể tải thông tin người dùng.',
        selectedUserLoading: false,
      });
    }
  },

  clearSelectedUser: () => set({ selectedUser: null, selectedUserError: null }),
}));

export default useUserStore;
