const fs = require('fs');
const path = require('path');
const { sequelize, User, Conversation, Message, School, Subscription, Plan, Invoice, Payment, Student, Teacher, Class, Parent, SchoolSettings, SchoolEvent, Expense, Grade, Attendance, Schedule, StudentNote, StudentDocument, Notification, SalaryStructure, SalarySlip, BusOperator, Route, RouteStudent, AuditLog, StaffAttendance, TeacherAttendance, FeeSetup, ModuleCatalog, PricingConfig } = require('../models');

async function ensureMigrationsTable() {
  const dialect = sequelize.getDialect();
  if (dialect === 'sqlite') {
    await sequelize.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, run_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  } else {
    await sequelize.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, run_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  }
}

async function hasMigration(name) {
  const [rows] = await sequelize.query('SELECT name FROM schema_migrations WHERE name = $1', { bind: [name] });
  return rows && rows.length > 0;
}

async function recordMigration(name) {
  const dialect = sequelize.getDialect();
  if (dialect === 'sqlite') {
    await sequelize.query('INSERT OR IGNORE INTO schema_migrations(name) VALUES (?)', { replacements: [name] });
  } else {
    await sequelize.query('INSERT INTO schema_migrations(name) VALUES ($1) ON CONFLICT (name) DO NOTHING', { bind: [name] });
  }
}

async function runBaseline() {
  const name = '000_baseline_sync';
  if (await hasMigration(name)) return;
  await sequelize.authenticate();
  await sequelize.sync();
  await recordMigration(name);
}

async function runMigrations() {
  const dir = path.join(__dirname, '..', 'migrations');
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
  for (const f of files) {
    const name = path.basename(f, '.js');
    if (await hasMigration(name)) continue;
    const mod = require(path.join(dir, f));
    const queryInterface = sequelize.getQueryInterface();

    // Add describeTable method if missing
    if (!queryInterface.describeTable) {
      queryInterface.describeTable = async (tableName) => {
        const [results] = await sequelize.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = '${tableName}'
        `);
        const desc = {};
        results.forEach(row => {
          desc[row.column_name] = {
            type: row.data_type,
            allowNull: row.is_nullable === 'YES'
          };
        });
        return desc;
      };
    }

    const models = { User, Conversation, Message, School, Subscription, Plan, Invoice, Payment, Student, Teacher, Class, Parent, SchoolSettings, SchoolEvent, Expense, Grade, Attendance, Schedule, StudentNote, StudentDocument, Notification, SalaryStructure, SalarySlip, BusOperator, Route, RouteStudent, AuditLog, StaffAttendance, TeacherAttendance, FeeSetup, ModuleCatalog, PricingConfig };
    if (typeof mod.up === 'function') {
      console.log(`Running migration: ${name}`);
      await mod.up({ sequelize, queryInterface, models });
      console.log(`✓ Completed: ${name}`);
    }
    await recordMigration(name);
  }
}

(async function main() {
  await ensureMigrationsTable();
  await runBaseline();
  await runMigrations();
  process.exit(0);
})();
