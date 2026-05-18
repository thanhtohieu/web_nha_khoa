import axiosClient from './axiosClient';

/**
 * AUTH API
 * Tất cả request không cần auth header (trừ logout).
 * axiosClient tự attach token qua interceptor.
 */

const authApi = {
  /**
   * POST /auth/login
   * @param {{ email: string, password: string }} credentials
   * @returns {{ ACCESS_TOKEN, refreshToken, user }}
   */
  login: (credentials) => axiosClient.post('/auth/login', credentials),

  /**
   * POST /auth/register
   * @param {{ name: string, email: string, password: string, confirmPassword: string }} data
   * @returns {{ message: string }}
   */
  register: (data) => axiosClient.post('/auth/register', data),

  /**
   * POST /auth/logout
   * Gửi refreshToken để server blacklist nó
   * @param {{ refreshToken: string }} data
   */
  logout: (data) => axiosClient.post('/auth/logout', data),

  /**
   * POST /auth/forgot-password
   * @param {{ email: string }} data
   * @returns {{ message: string }}
   */
  forgotPassword: (data) => axiosClient.post('/auth/forgot-password', data),

  /**
   * POST /auth/reset-password
   * @param {{ token: string, password: string, confirmPassword: string }} data
   * @returns {{ message: string }}
   */
  resetPassword: (data) => axiosClient.post('/auth/reset-password', data),

  /**
   * GET /auth/verify-email?token=xxx
   * @param {string} token - token từ URL query param
   * @returns {{ message: string }}
   */
  verifyEmail: (token) =>
    axiosClient.get('/auth/verify-email', { params: { token } }),

  /**
   * POST /auth/resend-verification
   * @param {{ email: string }} data
   * @returns {{ message: string }}
   */
  resendVerification: (data) =>
    axiosClient.post('/auth/resend-verification', data),

  /**
   * GET /auth/me — lấy thông tin user đang đăng nhập
   * @returns {{ user }}
   */
  getMe: () => axiosClient.get('/auth/me'),
};

export default authApi;
