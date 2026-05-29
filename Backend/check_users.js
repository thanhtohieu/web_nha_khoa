require('dotenv').config();
const { sequelize } = require('./src/config/database');
const User = require('./src/modules/user/user.model');

async function test() {
  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối database thành công!');
    const users = await User.findAll({ raw: true });
    console.log('📋 Danh sách tài khoản trong DB:');
    users.forEach(u => {
      console.log(`- Email: ${u.email}, Role: ${u.role}, Active: ${u.is_active}, Verified: ${u.is_verified}`);
    });
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    process.exit(0);
  }
}

test();
