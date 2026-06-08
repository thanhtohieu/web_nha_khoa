const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('clinic_db', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
});

async function check() {
  const [results] = await sequelize.query('SELECT id, doctor_profile_id, appointment_date FROM appointments');
  console.log(JSON.stringify(results, null, 2));
}
check();
