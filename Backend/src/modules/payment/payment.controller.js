const paymentService = require('./payment.service');
const { successResponse, createdResponse, paginatedResponse } = require('../../utils/response');

const paymentController = {
  async getAll(req, res, next) {
    try {
      const { payments, total } = await paymentService.getAll(req.query, req.user);
      const { page = 1, limit = 10 } = req.query;
      return paginatedResponse(res, { data: payments, total, page, limit });
    } catch (error) { next(error); }
  },

  async getById(req, res, next) {
    try {
      const data = await paymentService.getById(req.params.id, req.user);
      return successResponse(res, { data });
    } catch (error) { next(error); }
  },

  async getByAppointment(req, res, next) {
    try {
      const data = await paymentService.getByAppointment(req.params.appointmentId);
      return successResponse(res, { data });
    } catch (error) { next(error); }
  },

  async createCashPayment(req, res, next) {
    try {
      const { appointmentId, notes } = req.body;
      const data = await paymentService.createCashPayment(appointmentId, req.user.id, notes);
      return createdResponse(res, { message: 'Thanh toán tiền mặt thành công', data });
    } catch (error) { next(error); }
  },

  async createVnpayPayment(req, res, next) {
    try {
      const { appointmentId } = req.body;
      const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const data = await paymentService.createVnpayPayment(appointmentId, req.user.id, ipAddr);
      return successResponse(res, { message: 'Tạo link thanh toán thành công', data });
    } catch (error) { next(error); }
  },

  async vnpayReturn(req, res, next) {
    try {
      const result = await paymentService.handleVnpayReturn(req.query);
      const redirectUrl = result.success
        ? `${process.env.CLIENT_URL}/payment/success?txCode=${result.payment.transaction_code}`
        : `${process.env.CLIENT_URL}/payment/failed?txCode=${result.payment?.transaction_code}`;
      return res.redirect(redirectUrl);
    } catch (error) {
      return res.redirect(`${process.env.CLIENT_URL}/payment/failed`);
    }
  },

  async refund(req, res, next) {
    try {
      const data = await paymentService.refund(req.params.id, req.body.reason);
      return successResponse(res, { message: 'Hoàn tiền thành công', data });
    } catch (error) { next(error); }
  },

  async verifyVnpay(req, res, next) {
    try {
      const result = await paymentService.handleVnpayReturn(req.query);
      return successResponse(res, { data: result });
    } catch (error) { next(error); }
  },
};

module.exports = paymentController;
