const crypto = require('crypto');
const querystring = require('querystring');
const paymentRepository = require('./payment.repository');
const appointmentRepository = require('../appointment/appointment.repository');
const userRepository = require('../user/user.repository');
const { AppError } = require('../../middlewares/error.middleware');
const { getPagination } = require('../../utils/helpers');
const { PAYMENT_STATUS, PAYMENT_METHOD, APPOINTMENT_STATUS, ROLES } = require('../../utils/constants');
const notificationService = require('../notification/notification.service');
const logger = require('../../utils/logger');

// ========================
// VNPAY HELPERS
// ========================
const vnpayConfig = {
  tmnCode: process.env.VNPAY_TMN_CODE || 'F5DZKW5R',
  hashSecret: process.env.VNPAY_HASH_SECRET || 'FNIKCLMXJHBOBDODGDNMRISRHXSFRHDQ',
  url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  returnUrl: `${process.env.CLIENT_URL}/payment/result`,
  apiUrl: 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
};

const sortObject = (obj) => {
  const sorted = {};
  Object.keys(obj).sort().forEach((key) => { sorted[key] = obj[key]; });
  return sorted;
};

const createVnpayUrl = (transactionCode, amount, orderInfo, ipAddr) => {
  const date = new Date();
  
  // Format GMT+7 date (Vietnam Time)
  const formatVNTime = (d) => {
    const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
    return vnTime.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  };
  
  const createDate = formatVNTime(date);
  const expireDate = formatVNTime(new Date(date.getTime() + 15 * 60 * 1000));
  
  // Sửa lỗi IPv6 loopback (::1) sang IPv4 hợp lệ cho VNPay
  let ipv4 = ipAddr || '127.0.0.1';
  if (ipv4 === '::1' || ipv4.includes('::ffff:')) {
    ipv4 = '127.0.0.1';
  }

  // Sanitize orderInfo: chỉ cho phép ký tự ASCII hợp lệ
  const safeOrderInfo = orderInfo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 _\-\.]/g, '')
    .trim()
    .substring(0, 255);

  let params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: vnpayConfig.tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: String(transactionCode),
    vnp_OrderInfo: safeOrderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: Math.round(amount) * 100,
    vnp_ReturnUrl: vnpayConfig.returnUrl,
    vnp_IpAddr: ipv4,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  params = sortObject(params);

  // signData: KHÔNG encode (raw values) - đúng chuẩn VNPAY
  // Node.js querystring API: stringify(obj, sep, eq, options)
  // Dùng encodeURIComponent: (v) => v để bỏ qua encoding
  const signData = querystring.stringify(params, '&', '=', { encodeURIComponent: (v) => v });
  const hmac = crypto.createHmac('sha512', vnpayConfig.hashSecret);
  params.vnp_SecureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  // Build URL cuối: encode chuẩn để browser/VNPAY parse đúng
  return `${vnpayConfig.url}?${querystring.stringify(params)}`;
};

const verifyVnpayReturn = (query) => {
  const secureHash = query.vnp_SecureHash;
  const params = { ...query };
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;

  const sorted = sortObject(params);
  // req.query đã decode sẵn → stringify raw (không encode lại) để khớp hash lúc tạo
  const signData = querystring.stringify(sorted, '&', '=', { encodeURIComponent: (v) => v });
  const hmac = crypto.createHmac('sha512', vnpayConfig.hashSecret);
  const checkHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return checkHash === secureHash;
};

// ========================
// MOCK PAYMENT (dành cho dev / bài tập - không cần sandbox thật)
// ========================
const createMockPaymentUrl = (txCode, amount, orderInfo) => {
  const backendUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
  const params = new URLSearchParams({ txCode, amount, orderInfo });
  return `${backendUrl}/api/v1/payments/mock-page?${params.toString()}`;
};

// ========================
// PAYMENT SERVICE
// ========================
const paymentService = {
  // --------------------
  // TẠO THANH TOÁN (TIỀN MẶT)
  // --------------------
  async createCashPayment(appointmentId, userId, notes) {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) throw new AppError('Không tìm thấy lịch hẹn', 404);

    const existing = await paymentRepository.findByAppointmentId(appointmentId);
    if (existing && existing.status === PAYMENT_STATUS.PAID) {
      throw new AppError('Lịch hẹn này đã được thanh toán', 400);
    }

    // Tính số tiền: phí tư vấn + phí dịch vụ
    const amount = parseFloat(appointment.doctor?.consultation_fee || 0) +
                   parseFloat(appointment.service?.price || 0);

    const txCode = `CASH${Date.now()}`;

    const payment = await paymentRepository.create({
      appointment_id: appointmentId,
      user_id: appointment.patient_id,
      transaction_code: txCode,
      amount,
      method: PAYMENT_METHOD.CASH,
      status: PAYMENT_STATUS.PAID,
      paid_at: new Date(),
      notes,
    });

    // Cập nhật payment_status của appointment
    await appointmentRepository.update(appointmentId, {
      payment_status: PAYMENT_STATUS.PAID,
    });

    // Notify patient
    const patient = await userRepository.findById(appointment.patient_id);
    notificationService.notifyPaymentSuccess(
      { ...payment.toJSON(), amount },
      patient?.email
    ).catch(() => {});

    return payment;
  },

  // --------------------
  // TẠO URL THANH TOÁN VNPAY
  // --------------------
  async createVnpayPayment(appointmentId, userId, ipAddr) {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) throw new AppError('Không tìm thấy lịch hẹn', 404);

    // Chỉ patient của appointment được thanh toán
    if (appointment.patient_id !== userId) {
      throw new AppError('Bạn không có quyền thanh toán lịch hẹn này', 403);
    }

    const existing = await paymentRepository.findByAppointmentId(appointmentId);
    if (existing && existing.status === PAYMENT_STATUS.PAID) {
      throw new AppError('Lịch hẹn này đã được thanh toán', 400);
    }

    const amount = parseFloat(appointment.doctor?.consultation_fee || 0) +
                   parseFloat(appointment.service?.price || 0);

    const txCode = `VNP${Date.now()}`;
    const orderInfo = `Thanh toan lich kham ${appointment.booking_code}`;
    const paymentUrl = createVnpayUrl(txCode, amount, orderInfo, ipAddr);

    // Lưu payment với status PENDING
    const payment = await paymentRepository.create({
      appointment_id: appointmentId,
      user_id: userId,
      transaction_code: txCode,
      amount,
      method: PAYMENT_METHOD.VNPAY,
      status: PAYMENT_STATUS.PENDING,
      payment_url: paymentUrl,
    });

    return { paymentUrl, transactionCode: txCode, amount, payment };
  },

  // --------------------
  // XỬ LÝ VNPAY CALLBACK
  // --------------------
  async handleVnpayReturn(query) {
    const isValid = verifyVnpayReturn(query);
    const txCode = query.vnp_TxnRef;
    const responseCode = query.vnp_ResponseCode;

    const payment = await paymentRepository.findByTransactionCode(txCode);
    if (!payment) throw new AppError('Không tìm thấy giao dịch', 404);

    if (!isValid) {
      await paymentRepository.update(payment.id, { status: PAYMENT_STATUS.FAILED, gateway_data: query });
      throw new AppError('Chữ ký VNPay không hợp lệ', 400);
    }

    if (responseCode === '00') {
      // Thành công
      await paymentRepository.update(payment.id, {
        status: PAYMENT_STATUS.PAID,
        paid_at: new Date(),
        gateway_data: query,
      });
      await appointmentRepository.update(payment.appointment_id, {
        payment_status: PAYMENT_STATUS.PAID,
      });

      const patient = await userRepository.findById(payment.user_id);
      notificationService.notifyPaymentSuccess(payment, patient?.email).catch(() => {});

      return { success: true, payment };
    } else {
      await paymentRepository.update(payment.id, {
        status: PAYMENT_STATUS.FAILED,
        gateway_data: query,
      });
      return { success: false, payment, responseCode };
    }
  },

  // --------------------
  // HOÀN TIỀN (Admin)
  // --------------------
  async refund(paymentId, reason) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) throw new AppError('Không tìm thấy thanh toán', 404);
    if (payment.status !== PAYMENT_STATUS.PAID) {
      throw new AppError('Chỉ hoàn tiền cho giao dịch đã thanh toán', 400);
    }

    const updated = await paymentRepository.update(paymentId, {
      status: PAYMENT_STATUS.REFUNDED,
      refunded_at: new Date(),
      refund_reason: reason,
    });

    await appointmentRepository.update(payment.appointment_id, {
      payment_status: PAYMENT_STATUS.REFUNDED,
    });

    return updated;
  },

  // --------------------
  // DANH SÁCH
  // --------------------
  async getAll(query, requestUser) {
    const { page, limit, offset } = getPagination(query);
    const filters = { ...query, offset, limit };

    if (requestUser.role === ROLES.PATIENT) {
      filters.userId = requestUser.id;
    }

    return paymentRepository.findAll(filters);
  },

  async getById(id, requestUser) {
    const payment = await paymentRepository.findById(id);
    if (!payment) throw new AppError('Không tìm thấy thanh toán', 404);
    if (requestUser.role === ROLES.PATIENT && payment.user_id !== requestUser.id) {
      throw new AppError('Bạn không có quyền xem giao dịch này', 403);
    }
    return payment;
  },

  async getByAppointment(appointmentId) {
    return paymentRepository.findByAppointmentId(appointmentId);
  },

  // --------------------
  // MOCK VNPAY (dev / bài tập - không cần sandbox thật)
  // --------------------
  async createMockVnpayPayment(appointmentId, userId) {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) throw new AppError('Không tìm thấy lịch hẹn', 404);

    if (appointment.patient_id !== userId) {
      throw new AppError('Bạn không có quyền thanh toán lịch hẹn này', 403);
    }

    const existing = await paymentRepository.findByAppointmentId(appointmentId);
    if (existing && existing.status === PAYMENT_STATUS.PAID) {
      throw new AppError('Lịch hẹn này đã được thanh toán', 400);
    }

    const amount = parseFloat(appointment.doctor?.consultation_fee || 0) +
                   parseFloat(appointment.service?.price || 0);

    const txCode = `MOCK${Date.now()}`;
    const orderInfo = `Thanh toan lich kham ${appointment.booking_code}`;
    const paymentUrl = createMockPaymentUrl(txCode, amount, orderInfo);

    // Tạo hoặc cập nhật payment record
    let payment;
    if (existing) {
      payment = await paymentRepository.update(existing.id, {
        transaction_code: txCode,
        amount,
        method: PAYMENT_METHOD.VNPAY,
        status: PAYMENT_STATUS.PENDING,
        payment_url: paymentUrl,
      });
    } else {
      payment = await paymentRepository.create({
        appointment_id: appointmentId,
        user_id: userId,
        transaction_code: txCode,
        amount,
        method: PAYMENT_METHOD.VNPAY,
        status: PAYMENT_STATUS.PENDING,
        payment_url: paymentUrl,
      });
    }

    return { paymentUrl, transactionCode: txCode, amount, payment };
  },

  async completeMockPayment(txCode) {
    const payment = await paymentRepository.findByTransactionCode(txCode);
    if (!payment) throw new AppError('Không tìm thấy giao dịch', 404);

    await paymentRepository.update(payment.id, {
      status: PAYMENT_STATUS.PAID,
      paid_at: new Date(),
      gateway_data: { mock: true, completedAt: new Date().toISOString() },
    });

    await appointmentRepository.update(payment.appointment_id, {
      payment_status: PAYMENT_STATUS.PAID,
    });

    const patient = await userRepository.findById(payment.user_id);
    notificationService.notifyPaymentSuccess(payment, patient?.email).catch(() => {});

    return payment;
  },
};

module.exports = paymentService;
