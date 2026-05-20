import axiosClient from './axiosClient';

const paymentApi = {
  // ── Payment list ──────────────────────────────────────────
  getPayments: (params) => axiosClient.get('/payments', { params }),

  getPaymentById: (id) => axiosClient.get(`/payments/${id}`),

  // ── Checkout ──────────────────────────────────────────────
  /**
   * Create a payment invoice for an appointment/record
   * @param {Object} data - { appointmentId, method: 'cash' | 'vnpay', returnUrl? }
   */
  createPayment: (data) => axiosClient.post('/payments', data),
  createCashPayment: (data) => axiosClient.post('/payments/cash', data),
  createVnpayPayment: (data) => axiosClient.post('/payments/vnpay', data),
  // Mock VNPAY cho demo / bài tập (không cần sandbox thật)
  createMockVnpayPayment: (data) => axiosClient.post('/payments/mock-vnpay', data),

  /**
   * Process cash payment (doctor/receptionist confirms)
   */
  confirmCash: (id) => axiosClient.post(`/payments/${id}/confirm-cash`),

  /**
   * Initiate VNPay — returns { payUrl }
   */
  initiateVnpay: (id) => axiosClient.post(`/payments/${id}/vnpay`),

  /**
   * Verify VNPay return URL params (called after redirect)
   * @param {Object} params - raw query params from VNPay return URL
   */
  verifyVnpay: (params) => axiosClient.get('/payments/vnpay/return', { params }),

  // ── Refund ────────────────────────────────────────────────
  refundPayment: (id, reason) =>
    axiosClient.post(`/payments/${id}/refund`, { reason }),
};

export default paymentApi;
