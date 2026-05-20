const router = require('express').Router();
const paymentController = require('./payment.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { isAdmin, isAdminOrReceptionist } = require('../../middlewares/role.middleware');

// VNPay callback - không cần auth (VNPay gọi trực tiếp)
router.get('/vnpay-return', paymentController.vnpayReturn);
router.get('/vnpay/return', paymentController.verifyVnpay);

// Mock payment routes - không cần auth (trình duyệt redirect tới)
router.get('/mock-page', paymentController.mockPaymentPage);
router.get('/mock-success', paymentController.mockPaymentSuccess);

router.use(authenticate);

router.get('/', paymentController.getAll);
router.get('/appointment/:appointmentId', paymentController.getByAppointment);
router.get('/:id', paymentController.getById);

// Thanh toán tiền mặt: lễ tân / admin
router.post('/cash', isAdminOrReceptionist, paymentController.createCashPayment);

// Thanh toán VNPay: patient tự thanh toán
router.post('/vnpay', paymentController.createVnpayPayment);

// Mock VNPAY (dùng khi làm demo / bài tập - không cần sandbox thật)
router.post('/mock-vnpay', paymentController.createMockVnpayPayment);

// Hoàn tiền: admin only
router.patch('/:id/refund', isAdmin, paymentController.refund);

module.exports = router;
