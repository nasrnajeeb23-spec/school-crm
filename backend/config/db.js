const { Sequelize } = require('sequelize');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

let sequelize;
if (DATABASE_URL) {
  const useSSL = String(process.env.PG_SSL || '').toLowerCase() === 'true';
  sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: useSSL ? { ssl: { require: true, rejectUnauthorized: false } } : {},
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      idle: parseInt(process.env.DB_POOL_IDLE_MS || '10000', 10),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE_MS || '30000', 10)
    }
  });
} else {
  sequelize = new Sequelize({ dialect: 'sqlite', storage: path.join(__dirname, '..', 'dev.sqlite'), logging: false });
}

module.exports = sequelize;
