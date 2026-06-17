require('dotenv').config();
const { sequelize } = require('./src/config/database');
const User = require('./src/modules/user/user.model');
const DoctorProfile = require('./src/modules/doctor/doctor.model');
const Shift = require('./src/modules/shift/shift.model');
const Roster = require('./src/modules/roster/roster.model');
const Appointment = require('./src/modules/appointment/appointment.model');
const { SalaryConfig } = require('./src/modules/salary/salary.model');
const bcrypt = require('bcryptjs');

async function seedData() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // 1. Create SalaryConfig
    const configCount = await SalaryConfig.count();
    if (configCount === 0) {
      await SalaryConfig.create({});
      console.log('Created default SalaryConfig.');
    }

    // 2. Create a Doctor User
    let doctorUser = await User.findOne({ where: { email: 'bs.demo@phongkham.vn' } });
    if (!doctorUser) {
      const hash = await bcrypt.hash('123456', 10);
      doctorUser = await User.create({
        full_name: 'BS. Trần Văn Minh',
        email: 'bs.demo@phongkham.vn',
        password_hash: hash,
        phone: '0988111222',
        role: 'doctor',
      });
      console.log('Created doctor user: BS. Trần Văn Minh');
    }

    // 3. Create DoctorProfile
    let doctorProfile = await DoctorProfile.findOne({ where: { user_id: doctorUser.id } });
    if (!doctorProfile) {
      doctorProfile = await DoctorProfile.create({
        user_id: doctorUser.id,
        title: 'ThS.', // Thạc sĩ (hệ số 1.5)
        experience_years: 5,
      });
      console.log('Created DoctorProfile.');
    }

    // 4. Create Shifts
    let morningShift = await Shift.findOne({ where: { name: 'Ca Sáng' } });
    if (!morningShift) {
      morningShift = await Shift.create({
        name: 'Ca Sáng',
        start_time: '08:00:00',
        end_time: '12:00:00',
        max_doctors: 5,
        is_active: true,
      });
    }

    let afternoonShift = await Shift.findOne({ where: { name: 'Ca Chiều' } });
    if (!afternoonShift) {
      afternoonShift = await Shift.create({
        name: 'Ca Chiều',
        start_time: '13:30:00',
        end_time: '17:30:00',
        max_doctors: 5,
        is_active: true,
      });
    }
    console.log('Ensured Shifts exist.');

    // 5. Create Patient User
    let patientUser = await User.findOne({ where: { phone: '0999999999' } });
    if (!patientUser) {
      const hash = await bcrypt.hash('123456', 10);
      patientUser = await User.create({
        full_name: 'Bệnh nhân Demo',
        email: 'benhnhan@demo.vn',
        password_hash: hash,
        phone: '0999999999',
        role: 'patient',
      });
    }

    // 6. Create Rosters & Appointments for June 2026
    const dates = [
      '2026-06-01', '2026-06-02', '2026-06-05', 
      '2026-06-10', '2026-06-15', '2026-06-20', '2026-06-28'
    ];

    for (const dateStr of dates) {
      // Morning roster
      const [mRoster] = await Roster.findOrCreate({
        where: {
          doctor_profile_id: doctorProfile.id,
          shift_id: morningShift.id,
          roster_date: dateStr,
        },
        defaults: {
          status: 'approved',
          notes: 'Auto generated demo',
        }
      });
      // Ensure it's approved
      if (mRoster.status !== 'approved') await mRoster.update({ status: 'approved' });

      // Afternoon roster
      const [aRoster] = await Roster.findOrCreate({
        where: {
          doctor_profile_id: doctorProfile.id,
          shift_id: afternoonShift.id,
          roster_date: dateStr,
        },
        defaults: {
          status: 'approved',
          notes: 'Auto generated demo',
        }
      });
      if (aRoster.status !== 'approved') await aRoster.update({ status: 'approved' });

      // Create Appointment for Morning Shift
      await Appointment.findOrCreate({
        where: {
          doctor_profile_id: doctorProfile.id,
          patient_id: patientUser.id,
          appointment_date: dateStr,
          appointment_time: '09:00',
        },
        defaults: {
          status: 'completed',
          reason: 'Khám định kỳ',
          booking_code: `BK-${dateStr.replace(/-/g, '')}-01`,
          complexity_level: 0.2, // Hệ số bệnh nhân
        }
      });

      // Create Appointment for Afternoon Shift
      await Appointment.findOrCreate({
        where: {
          doctor_profile_id: doctorProfile.id,
          patient_id: patientUser.id,
          appointment_date: dateStr,
          appointment_time: '14:00',
        },
        defaults: {
          status: 'completed',
          reason: 'Nhổ răng',
          booking_code: `BK-${dateStr.replace(/-/g, '')}-02`,
          complexity_level: 0.5,
        }
      });
    }

    console.log('Created Rosters and Appointments for June 2026.');
    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seedData();
