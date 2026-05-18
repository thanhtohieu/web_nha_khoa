import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import authApi from '../api/auth.api';
import { ACCESS_TOKEN } from '../utils/constants';
import {
  setTokens,
  removeTokens,
  getRefreshToken,
  getACCESS_TOKEN,
  extractErrorMessage,
} from '../utils/helpers';

/**
 * AUTH STORE
 *
 * State shape:
 *   user          — object | null
 *   isAuth        — bool (có token hợp lệ không)
 *   loading       — bool (đang gọi API)
 *   error         — string | null
 *   initialized   — bool (đã bootstrap/getMe chưa)
 */

const useAuthStore = create(
  devtools(
    (set, get) => ({
      // ── State ────────────────────────────────────────────────────────────────
      user: null,
      isAuth: false,
      loading: false,
      error: null,
      initialized: false,

      // ── Helpers nội bộ ───────────────────────────────────────────────────────
      _setLoading: (loading) => set({ loading }, false, 'setLoading'),
      _setError: (error) => set({ error }, false, 'setError'),
      _clearError: () => set({ error: null }, false, 'clearError'),

      // ── Actions ──────────────────────────────────────────────────────────────

      /**
       * Login: gọi API → lưu token → set user vào store
       */
      login: async (credentials) => {
        const { _setLoading, _setError } = get();
        _setLoading(true);
        set({ error: null });

        try {
          const { data } = await authApi.login(credentials);
          const { ACCESS_TOKEN, refreshToken, user } = data;

          setTokens({ ACCESS_TOKEN, refreshToken });
          set({ user, isAuth: true, error: null }, false, 'login/success');

          return { success: true, user };
        } catch (err) {
          const message = extractErrorMessage(err, 'Đăng nhập thất bại.');
          _setError(message);
          return { success: false, message };
        } finally {
          _setLoading(false);
        }
      },

      /**
       * Register: gọi API → không tự login (cần verify email)
       */
      register: async (formData) => {
        const { _setLoading, _setError } = get();
        _setLoading(true);
        set({ error: null });

        try {
          const { data } = await authApi.register(formData);
          return { success: true, message: data.message };
        } catch (err) {
          const message = extractErrorMessage(err, 'Đăng ký thất bại.');
          _setError(message);
          return { success: false, message };
        } finally {
          _setLoading(false);
        }
      },

      /**
       * Logout: gửi refreshToken lên server để blacklist → clear local state
       */
      logout: async () => {
        const refreshToken = getRefreshToken();

        // Fire-and-forget: dù server lỗi vẫn clear phía client
        try {
          if (refreshToken) {
            await authApi.logout({ refreshToken });
          }
        } catch {
          // intentionally ignored
        } finally {
          removeTokens();
          set(
            { user: null, isAuth: false, error: null },
            false,
            'logout'
          );
        }
      },

      /**
       * Forgot password: gửi email reset
       */
      forgotPassword: async (email) => {
        const { _setLoading, _setError } = get();
        _setLoading(true);
        set({ error: null });

        try {
          const { data } = await authApi.forgotPassword({ email });
          return { success: true, message: data.message };
        } catch (err) {
          const message = extractErrorMessage(
            err,
            'Không thể gửi email đặt lại mật khẩu.'
          );
          _setError(message);
          return { success: false, message };
        } finally {
          _setLoading(false);
        }
      },

      /**
       * Reset password bằng token từ email
       */
      resetPassword: async ({ token, password, confirmPassword }) => {
        const { _setLoading, _setError } = get();
        _setLoading(true);
        set({ error: null });

        try {
          const { data } = await authApi.resetPassword({
            token,
            password,
            confirmPassword,
          });
          return { success: true, message: data.message };
        } catch (err) {
          const message = extractErrorMessage(
            err,
            'Đặt lại mật khẩu thất bại.'
          );
          _setError(message);
          return { success: false, message };
        } finally {
          _setLoading(false);
        }
      },

      /**
       * Verify email bằng token từ URL
       */
      verifyEmail: async (token) => {
        const { _setLoading, _setError } = get();
        _setLoading(true);
        set({ error: null });

        try {
          const { data } = await authApi.verifyEmail(token);
          return { success: true, message: data.message };
        } catch (err) {
          const message = extractErrorMessage(err, 'Xác thực email thất bại.');
          _setError(message);
          return { success: false, message };
        } finally {
          _setLoading(false);
        }
      },

      /**
       * Resend verification email
       */
      resendVerification: async (email) => {
        const { _setLoading, _setError } = get();
        _setLoading(true);
        set({ error: null });

        try {
          const { data } = await authApi.resendVerification({ email });
          return { success: true, message: data.message };
        } catch (err) {
          const message = extractErrorMessage(err, 'Không thể gửi lại email.');
          _setError(message);
          return { success: false, message };
        } finally {
          _setLoading(false);
        }
      },

      /**
       * Bootstrap: gọi khi app mount, kiểm tra token còn hợp lệ không
       * → lấy user info từ server
       */
      initialize: async () => {
        // Nếu không có token → skip, không cần gọi API
        const hasToken = !!getACCESS_TOKEN();

        if (!hasToken) {
          set({ initialized: true }, false, 'initialize/noToken');
          return;
        }

        try {
          const { data } = await authApi.getMe();
          set(
            { user: data.user, isAuth: true, initialized: true },
            false,
            'initialize/success'
          );
        } catch {
          // Token hết hạn hoặc không hợp lệ
          removeTokens();
          set(
            { user: null, isAuth: false, initialized: true },
            false,
            'initialize/failed'
          );
        }
      },

      // ── Selectors (computed getters) ─────────────────────────────────────────
      isAdmin: () => get().user?.role === 'admin',
    }),
    { name: 'AuthStore' }
  )
);

export default useAuthStore;

// ── Named selectors để tránh re-render thừa ───────────────────────────────────
export const selectUser = (state) => state.user;
export const selectIsAuth = (state) => state.isAuth;
export const selectAuthLoading = (state) => state.loading;
export const selectAuthError = (state) => state.error;
export const selectInitialized = (state) => state.initialized;
