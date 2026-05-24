const { sequelize } = require('./src/config/database');
const setupAssociations = require('./src/config/associations');
const dashboardService = require('./src/modules/dashboard/dashboard.service');
const DoctorProfile = require('./src/modules/doctor/doctor.model');

(async () => {
  await sequelize.authenticate();
  setupAssociations();
  
  try {
    const doctor = await DoctorProfile.findOne({ where: { id: '8fdff496-3b89-4af8-9ff2-4edf8c30b9ba' }, raw: true });
    if (!doctor) { console.log('No doctor found'); return; }

    const res = await dashboardService.getDoctorDashboard(doctor.user_id, { period: 'month' });
    console.log(JSON.stringify(res, null, 2));

  } catch(e) {
    console.log('ERR:', e.message, e.stack);
  }
  process.exit(0);
})();
