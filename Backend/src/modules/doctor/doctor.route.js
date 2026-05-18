const router = require('express').Router();
const doctorController = require('./doctor.controller');
const { doctorProfileValidation } = require('./doctor.validation');
const { validate } = require('../../middlewares/validate.middleware');
const { authenticate, optionalAuth } = require('../../middlewares/auth.middleware');
const { isAdmin, isAdminOrDoctor, isDoctor } = require('../../middlewares/role.middleware');

// Public: xem danh sách bác sĩ & slots
router.get('/', optionalAuth, doctorController.getAllDoctors);
router.get('/:id', optionalAuth, doctorController.getDoctorById);
router.get('/:id/slots', doctorController.getAvailableSlots);

// Protected
router.use(authenticate);

// Doctor: quản lý profile bản thân
router.get('/me/profile', isDoctor, doctorController.getMyProfile);
router.put('/me/profile', isDoctor, doctorProfileValidation, validate, doctorController.updateMyProfile);

// Admin: tạo & quản lý doctor profiles
router.post('/', isAdmin, doctorProfileValidation, validate, doctorController.createDoctorProfile);
router.put('/:id', isAdminOrDoctor, doctorProfileValidation, validate, doctorController.updateDoctorProfile);
router.patch('/:id/availability', isAdminOrDoctor, doctorController.toggleAvailability);

module.exports = router;
