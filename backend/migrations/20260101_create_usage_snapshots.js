module.exports = {
  up: async ({ sequelize, queryInterface }) => {
    const dialect = sequelize.getDialect();
    const table = 'usage_snapshots';
    const exists = await queryInterface.showAllTables().then(tables => {
      const list = tables.map(x => (typeof x === 'string' ? x : (x.tableName || x.name || ''))).map(s => String(s).toLowerCase());
      return list.includes(String(table).toLowerCase());
    }).catch(() => false);
    if (exists) return;

    await queryInterface.createTable(table, {
      id: { type: dialect === 'postgres' ? 'SERIAL' : 'INTEGER', primaryKey: true, autoIncrement: dialect !== 'postgres' },
      schoolId: { type: 'INTEGER', allowNull: false },
      date: { type: 'DATE', allowNull: false },
      period: { type: 'VARCHAR(32)', allowNull: false, defaultValue: 'daily' },
      students: { type: 'INTEGER', allowNull: false, defaultValue: 0 },
      teachers: { type: 'INTEGER', allowNull: false, defaultValue: 0 },
      invoices: { type: 'INTEGER', allowNull: false, defaultValue: 0 },
      storageGB: { type: 'FLOAT', allowNull: false, defaultValue: 0 },
      limits: { type: dialect === 'postgres' ? 'JSONB' : 'JSON', allowNull: true },
      overageItems: { type: dialect === 'postgres' ? 'JSONB' : 'JSON', allowNull: true },
      overageTotal: { type: 'DECIMAL(10,2)', allowNull: false, defaultValue: 0 },
      currency: { type: 'VARCHAR(10)', allowNull: false, defaultValue: 'USD' },
      createdAt: { type: dialect === 'postgres' ? 'TIMESTAMPTZ' : 'DATETIME', allowNull: false, defaultValue: dialect === 'postgres' ? sequelize.literal('NOW()') : sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: dialect === 'postgres' ? 'TIMESTAMPTZ' : 'DATETIME', allowNull: false, defaultValue: dialect === 'postgres' ? sequelize.literal('NOW()') : sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex(table, ['schoolId', 'date']);
    await queryInterface.addIndex(table, ['schoolId', 'period', 'date']);
  },
};

