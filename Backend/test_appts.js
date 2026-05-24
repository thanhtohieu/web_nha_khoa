const { sequelize } = require('./src/config/database');
const Appointment = require('./src/modules/appointment/appointment.model');

(async () => {
  await sequelize.authenticate();
  const appts = await Appointment.findAll({ raw: true });
  console.log(appts.map(a => `${a.appointment_date} - docId: ${a.doctor_profile_id} status: ${a.status}`));
  process.exit(0);
})();
