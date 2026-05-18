const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'clinic_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    timezone: '+07:00',
    logging: process.env.NODE_ENV === 'development'
      ? (sql) => logger.debug(sql)
      : false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      min: parseInt(process.env.DB_POOL_MIN) || 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      underscored: false,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Database kết nối thành công');

    if (process.env.DB_SYNC === 'true') {
      await sequelize.sync({ alter: process.env.DB_SYNC_ALTER === 'true' });
      logger.info('✅ Database sync hoàn tất');
    }
  } catch (error) {
    logger.error('❌ Kết nối database thất bại:', error.message);
    throw error;
  }
};

module.exports = { sequelize, connectDB };
