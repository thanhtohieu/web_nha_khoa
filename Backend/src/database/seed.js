require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const setupAssociations = require('../config/associations');
const { ROLES, GENDER, DAYS_OF_WEEK, BLOG_STATUS } = require('../utils/constants');

// Import models
const User = require('../modules/user/user.model');
const DoctorProfile = require('../modules/doctor/doctor.model');
const Specialty = require('../modules/service/specialty.model');
const Service = require('../modules/service/service.model');
const BlogCategory = require('../modules/blog/blog.model').BlogCategory;
const { Blog } = require('../modules/blog/blog.model');

// Khởi tạo associations trước khi dùng
setupAssociations();

const seed = async () => {
  const t = await sequelize.transaction();
  try {
    logger.info('🌱 Bắt đầu seeding...');
    await sequelize.authenticate();

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const password = await bcrypt.hash('Password@123', saltRounds);

    // ========================
    // 1. USERS
    // ========================
    const [admin] = await User.findOrCreate({
      where: { email: 'admin@phongkham.vn' },
      defaults: {
        full_name: 'Quản Trị Viên',
        email: 'admin@phongkham.vn',
        phone: '0901000001',
        password_hash: password,
        role: ROLES.ADMIN,
        gender: GENDER.MALE,
        is_active: true,
        is_verified: true,
      },
      transaction: t,
    });

    const [receptionist] = await User.findOrCreate({
      where: { email: 'letan@phongkham.vn' },
      defaults: {
        full_name: 'Nguyễn Thị Lan',
        email: 'letan@phongkham.vn',
        phone: '0901000002',
        password_hash: password,
        role: ROLES.RECEPTIONIST,
        gender: GENDER.FEMALE,
        is_active: true,
        is_verified: true,
      },
      transaction: t,
    });

    const [doctorUser1] = await User.findOrCreate({
      where: { email: 'bs.minh@phongkham.vn' },
      defaults: {
        full_name: 'BS. Trần Văn Minh',
        email: 'bs.minh@phongkham.vn',
        phone: '0901000003',
        password_hash: password,
        role: ROLES.DOCTOR,
        gender: GENDER.MALE,
        is_active: true,
        is_verified: true,
      },
      transaction: t,
    });

    const [doctorUser2] = await User.findOrCreate({
      where: { email: 'bs.hoa@phongkham.vn' },
      defaults: {
        full_name: 'BS. Lê Thị Hoa',
        email: 'bs.hoa@phongkham.vn',
        phone: '0901000004',
        password_hash: password,
        role: ROLES.DOCTOR,
        gender: GENDER.FEMALE,
        is_active: true,
        is_verified: true,
      },
      transaction: t,
    });

    const [patient1] = await User.findOrCreate({
      where: { email: 'benhnhan1@gmail.com' },
      defaults: {
        full_name: 'Phạm Văn An',
        email: 'benhnhan1@gmail.com',
        phone: '0912345601',
        password_hash: password,
        role: ROLES.PATIENT,
        gender: GENDER.MALE,
        date_of_birth: new Date('1990-05-15'),
        address: '123 Đường Lê Lợi, Q.1, TP.HCM',
        is_active: true,
        is_verified: true,
      },
      transaction: t,
    });

    const [patient2] = await User.findOrCreate({
      where: { email: 'benhnhan2@gmail.com' },
      defaults: {
        full_name: 'Trần Thị Bình',
        email: 'benhnhan2@gmail.com',
        phone: '0912345602',
        password_hash: password,
        role: ROLES.PATIENT,
        gender: GENDER.FEMALE,
        date_of_birth: new Date('1985-08-22'),
        address: '45 Nguyễn Huệ, Q.1, TP.HCM',
        is_active: true,
        is_verified: true,
      },
      transaction: t,
    });

    logger.info('✅ Seeded: Users');

    // ========================
    // 2. SPECIALTIES
    // ========================
    const specialties = await Promise.all([
      Specialty.findOrCreate({
        where: { slug: 'noi-khoa' },
        defaults: { name: 'Nội khoa', slug: 'noi-khoa', description: 'Khám và điều trị các bệnh nội tạng', icon: '🫁', is_active: true },
        transaction: t,
      }),
      Specialty.findOrCreate({
        where: { slug: 'nhi-khoa' },
        defaults: { name: 'Nhi khoa', slug: 'nhi-khoa', description: 'Chăm sóc sức khỏe trẻ em', icon: '👶', is_active: true },
        transaction: t,
      }),
      Specialty.findOrCreate({
        where: { slug: 'san-phu-khoa' },
        defaults: { name: 'Sản - Phụ khoa', slug: 'san-phu-khoa', description: 'Chăm sóc sức khỏe phụ nữ và thai sản', icon: '🤰', is_active: true },
        transaction: t,
      }),
      Specialty.findOrCreate({
        where: { slug: 'rang-ham-mat' },
        defaults: { name: 'Răng hàm mặt', slug: 'rang-ham-mat', description: 'Khám và điều trị bệnh về răng miệng', icon: '🦷', is_active: true },
        transaction: t,
      }),
      Specialty.findOrCreate({
        where: { slug: 'da-lieu' },
        defaults: { name: 'Da liễu', slug: 'da-lieu', description: 'Khám và điều trị bệnh ngoài da', icon: '🩺', is_active: true },
        transaction: t,
      }),
    ]);

    const [noikhoaSpec] = specialties[0];
    const [nhiSpec] = specialties[1];
    const [sanphuSpec] = specialties[2];
    logger.info('✅ Seeded: Specialties');

    // ========================
    // 3. SERVICES
    // ========================
    await Promise.all([
      Service.findOrCreate({
        where: { name: 'Khám tổng quát' },
        defaults: {
          name: 'Khám tổng quát',
          slug: 'kham-tong-quat',
          specialty_id: noikhoaSpec.id,
          price: 200000,
          duration_minutes: 30,
          description: 'Kiểm tra sức khỏe toàn diện',
          is_active: true,
        },
        transaction: t,
      }),
      Service.findOrCreate({
        where: { name: 'Khám nội khoa' },
        defaults: {
          name: 'Khám nội khoa',
          slug: 'kham-noi-khoa',
          specialty_id: noikhoaSpec.id,
          price: 250000,
          duration_minutes: 30,
          description: 'Tư vấn và điều trị bệnh nội khoa',
          is_active: true,
        },
        transaction: t,
      }),
      Service.findOrCreate({
        where: { name: 'Khám nhi' },
        defaults: {
          name: 'Khám nhi',
          slug: 'kham-nhi',
          specialty_id: nhiSpec.id,
          price: 220000,
          duration_minutes: 30,
          description: 'Khám và tư vấn sức khỏe cho trẻ em',
          is_active: true,
        },
        transaction: t,
      }),
      Service.findOrCreate({
        where: { name: 'Khám thai định kỳ' },
        defaults: {
          name: 'Khám thai định kỳ',
          slug: 'kham-thai-dinh-ky',
          specialty_id: sanphuSpec.id,
          price: 300000,
          duration_minutes: 45,
          description: 'Theo dõi thai kỳ và sức khỏe mẹ bầu',
          is_active: true,
        },
        transaction: t,
      }),
    ]);
    logger.info('✅ Seeded: Services');

    // ========================
    // 4. DOCTOR PROFILES
    // ========================
    await DoctorProfile.findOrCreate({
      where: { user_id: doctorUser1.id },
      defaults: {
        user_id: doctorUser1.id,
        specialty_id: noikhoaSpec.id,
        title: 'Thạc sĩ, Bác sĩ',
        bio: 'Bác sĩ Trần Văn Minh có hơn 10 năm kinh nghiệm trong lĩnh vực nội khoa.',
        experience_years: 10,
        consultation_fee: 250000,
        working_days: [DAYS_OF_WEEK.MONDAY, DAYS_OF_WEEK.WEDNESDAY, DAYS_OF_WEEK.FRIDAY],
        working_start: '08:00',
        working_end: '17:00',
        slot_duration_minutes: 30,
        is_available: true,
        certificate: 'Bằng chuyên khoa I Nội khoa - Đại học Y Dược TP.HCM',
        education: 'Đại học Y Dược TP.HCM',
      },
      transaction: t,
    });

    await DoctorProfile.findOrCreate({
      where: { user_id: doctorUser2.id },
      defaults: {
        user_id: doctorUser2.id,
        specialty_id: nhiSpec.id,
        title: 'Bác sĩ chuyên khoa I',
        bio: 'Bác sĩ Lê Thị Hoa có kinh nghiệm 8 năm trong chuyên khoa nhi.',
        experience_years: 8,
        consultation_fee: 220000,
        working_days: [DAYS_OF_WEEK.TUESDAY, DAYS_OF_WEEK.THURSDAY, DAYS_OF_WEEK.SATURDAY],
        working_start: '07:30',
        working_end: '16:30',
        slot_duration_minutes: 30,
        is_available: true,
        certificate: 'Bằng chuyên khoa I Nhi khoa',
        education: 'Đại học Y Hà Nội',
      },
      transaction: t,
    });
    logger.info('✅ Seeded: Doctor profiles');

    // ========================
    // 5. BLOG CATEGORIES
    // ========================
    await Promise.all([
      BlogCategory.findOrCreate({
        where: { slug: 'suc-khoe-tong-quat' },
        defaults: { name: 'Sức khỏe tổng quát', slug: 'suc-khoe-tong-quat', description: 'Tin tức và kiến thức sức khỏe chung' },
        transaction: t,
      }),
      BlogCategory.findOrCreate({
        where: { slug: 'dinh-duong' },
        defaults: { name: 'Dinh dưỡng', slug: 'dinh-duong', description: 'Chế độ ăn uống và dinh dưỡng hợp lý' },
        transaction: t,
      }),
      BlogCategory.findOrCreate({
        where: { slug: 'vaccine-phong-benh' },
        defaults: { name: 'Vaccine & Phòng bệnh', slug: 'vaccine-phong-benh', description: 'Thông tin về tiêm chủng và phòng ngừa dịch bệnh' },
        transaction: t,
      }),
    ]);
    logger.info('✅ Seeded: Blog categories');

    await t.commit();
    logger.info('🎉 Seeding hoàn thành!');
    logger.info('');
    logger.info('📋 Tài khoản mặc định (mật khẩu: Password@123):');
    logger.info('   Admin       : admin@phongkham.vn');
    logger.info('   Lễ tân      : letan@phongkham.vn');
    logger.info('   Bác sĩ 1    : bs.minh@phongkham.vn');
    logger.info('   Bác sĩ 2    : bs.hoa@phongkham.vn');
    logger.info('   Bệnh nhân 1 : benhnhan1@gmail.com');
    logger.info('   Bệnh nhân 2 : benhnhan2@gmail.com');
    process.exit(0);
  } catch (error) {
    await t.rollback();
    logger.error('❌ Seeding thất bại:', error);
    process.exit(1);
  }
};

seed();
