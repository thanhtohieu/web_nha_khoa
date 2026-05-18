const router = require('express').Router();
const medicalController = require('./medical.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { isAdmin, isAdminOrDoctor } = require('../../middlewares/role.middleware');

router.use(authenticate);

router.get('/', medicalController.getAll);
router.get('/appointment/:appointmentId', medicalController.getByAppointment);
router.get('/:id', medicalController.getById);
router.post('/', isAdminOrDoctor, medicalController.create);
router.put('/:id', isAdminOrDoctor, medicalController.update);

module.exports = router;
