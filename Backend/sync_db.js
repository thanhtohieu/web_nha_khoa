const { sequelize } = require('./src/config/database');
const setupAssociations = require('./src/config/associations');

async function syncDb() {
  try {
    setupAssociations();
    await sequelize.sync({ alter: true });
    console.log('Database synced successfully with alter: true');
    process.exit(0);
  } catch (error) {
    console.error('Error syncing database:', error);
    process.exit(1);
  }
}

syncDb();
