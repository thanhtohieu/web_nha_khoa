const { sequelize } = require('./src/config/database');
const setupAssociations = require('./src/config/associations');
const medicalService = require('./src/modules/medical/medical.service');
const User = require('./src/modules/user/user.model');
const Appointment = require('./src/modules/appointment/appointment.model');
const DoctorProfile = require('./src/modules/doctor/doctor.model');
const { MedicalRecord } = require('./src/modules/medical/medical.model');

(async () => {
  await sequelize.authenticate();
  setupAssociations();
  
  try {
    const doctor = await User.findOne({ where: { role: 'doctor' }, raw: true });
    const doctorProfile = await DoctorProfile.findOne({ where: { user_id: doctor.id }, raw: true });

    let appt = await Appointment.findOne({ where: { doctor_profile_id: doctorProfile.id }, raw: true });
    if (!appt) { console.log('No appt found for this doctor'); return; }
    
    let record = await MedicalRecord.findOne({ where: { appointment_id: appt.id }, raw: true });
    if (!record) {
       console.log('No record found, creating one...');
       const r = await medicalService.create({
         appointmentId: appt.id,
         chiefComplaint: 'Test',
         diagnosis: 'Test'
       }, doctor);
       record = r;
    }
    console.log('Record ID:', record.id);

    const res = await medicalService.savePrescription(record.id, {
      items: [{ medicineName: 'Paracetamol', dosage: '500mg', quantity: 10 }]
    }, doctor);

    console.log('Prescription saved:', JSON.stringify(res, null, 2));

  } catch(e) {
    console.log('ERR:', e.message, e.stack);
  }
  process.exit(0);
})();
