const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('./src/config/database');
const Specialty = require('./src/modules/service/specialty.model');
const Service = require('./src/modules/service/service.model');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    // 1. Update Da Lieu
    await Specialty.update(
      { name: 'Nhổ răng - Tiểu phẫu', slug: 'nho-rang-tieu-phau', description: 'Nhổ răng khôn, tiểu phẫu trong miệng', icon: '💉' },
      { where: { slug: 'da-lieu' } }
    );

    // 2. Update Rang Ham Mat -> Cay ghep Implant
    await Specialty.update(
      { name: 'Cấy ghép Implant', slug: 'cay-ghep-implant', description: 'Phục hình răng đã mất bằng Implant', icon: '🔩' },
      { where: { slug: 'rang-ham-mat' } }
    );

    // 3. Update Noi khoa
    await Specialty.update(
      { name: 'Nha khoa tổng quát', slug: 'nha-khoa-tong-quat', description: 'Khám, tư vấn và điều trị răng miệng cơ bản', icon: '🪥' },
      { where: { slug: 'noi-khoa' } }
    );

    // 4. Update Nhi khoa
    await Specialty.update(
      { name: 'Nha khoa trẻ em', slug: 'nha-khoa-tre-em', description: 'Chăm sóc và điều trị răng miệng cho trẻ nhỏ', icon: '👶' },
      { where: { slug: 'nhi-khoa' } }
    );

    // 5. Update San phu khoa
    await Specialty.update(
      { name: 'Chỉnh nha - Niềng răng', slug: 'chinh-nha', description: 'Chỉnh nha, niềng răng thẩm mỹ', icon: '😁' },
      { where: { slug: 'san-phu-khoa' } }
    );

    // Update Services (Names only for existing)
    await Service.update({ name: 'Khám và tư vấn răng miệng', slug: 'kham-tu-van-rang-mieng', description: 'Khám tổng quát, chụp X-quang và tư vấn phác đồ điều trị' }, { where: { slug: 'kham-tong-quat' }});
    await Service.update({ name: 'Nhổ răng sữa', slug: 'nho-rang-sua', description: 'Nhổ răng sữa an toàn, không đau cho bé' }, { where: { slug: 'kham-nhi' }});
    await Service.update({ name: 'Niềng răng mắc cài kim loại', slug: 'nieng-rang-mac-cai-kim-loai', description: 'Chỉnh nha bằng mắc cài kim loại chuẩn' }, { where: { slug: 'sieu-am-thai-4d' }});
    await Service.update({ name: 'Nhổ răng khôn (Răng số 8)', slug: 'nho-rang-khon' }, { where: { slug: 'kham-noi-khoa' }});
    await Service.update({ name: 'Cạo vôi răng - Đánh bóng', slug: 'cao-voi-rang' }, { where: { slug: 'kham-thai-dinh-ky' }});

    console.log('Update complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
