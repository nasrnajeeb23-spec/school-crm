'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up({ queryInterface, sequelize }) {
    const Sequelize = sequelize.Sequelize;
    await queryInterface.createTable('SystemSettings', {
      key: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false
      },
      value: {
        type: Sequelize.JSON,
        allowNull: false
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Seed default limits
    await queryInterface.bulkInsert('SystemSettings', [{
      key: 'DEFAULT_LIMITS',
      value: JSON.stringify({
        students: 50,
        teachers: 5,
        invoices: 100,
        storageGB: 1
      }),
      description: 'Default usage limits for schools without specific plan limits',
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  async down({ queryInterface }) {
    await queryInterface.dropTable('SystemSettings');
  }
};
