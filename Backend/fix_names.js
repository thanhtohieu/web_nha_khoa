const { sequelize } = require('./src/config/database');

async function fixDuplicate() {
  await sequelize.query("UPDATE users SET full_name = 'BS. Trần Văn Minh (Demo)' WHERE email = 'bs.demo@phongkham.vn'");
  await sequelize.query("UPDATE users SET full_name = 'BS. Nguyễn Văn A' WHERE email = 'bs.minh@phongkham.vn'");
  console.log("Done");
  process.exit(0);
}

fixDuplicate();
