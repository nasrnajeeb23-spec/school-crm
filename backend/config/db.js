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
  });
} else {
  sequelize = new Sequelize({ dialect: 'sqlite', storage: path.join(__dirname, '..', 'dev.sqlite'), logging: false });
}

module.exports = sequelize;