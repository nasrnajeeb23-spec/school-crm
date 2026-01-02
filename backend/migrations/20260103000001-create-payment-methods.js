'use strict';

module.exports = {
    async up({ queryInterface, sequelize }) {
        const Sequelize = sequelize.Sequelize;
        await queryInterface.createTable('PaymentMethods', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            type: {
                type: Sequelize.ENUM('BANK_TRANSFER', 'ONLINE', 'OTHER'),
                allowNull: false,
                defaultValue: 'BANK_TRANSFER'
            },
            provider: {
                type: Sequelize.STRING,
                allowNull: false
            },
            accountName: {
                type: Sequelize.STRING,
                allowNull: true
            },
            accountNumber: {
                type: Sequelize.STRING,
                allowNull: true
            },
            iban: {
                type: Sequelize.STRING,
                allowNull: true
            },
            swift: {
                type: Sequelize.STRING,
                allowNull: true
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            logoUrl: {
                type: Sequelize.STRING,
                allowNull: true
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // Seed default bank (optional, but good for UX)
        /*
        await queryInterface.bulkInsert('PaymentMethods', [{
          type: 'BANK_TRANSFER',
          provider: 'البنك الافتراضي',
          accountName: 'اسم الشركة',
          accountNumber: '1234567890',
          iban: 'SA0000000000000000000000',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }]);
        */
    },

    async down({ queryInterface }) {
        await queryInterface.dropTable('PaymentMethods');
    }
};
