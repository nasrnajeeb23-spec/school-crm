'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const table = await queryInterface.describeTable('Schools');

        if (!table.address) {
            await queryInterface.addColumn('Schools', 'address', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }

        if (!table.phone) {
            await queryInterface.addColumn('Schools', 'phone', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }

        if (!table.website) {
            await queryInterface.addColumn('Schools', 'website', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }

        if (!table.logoUrl) {
            await queryInterface.addColumn('Schools', 'logoUrl', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }

        if (!table.description) {
            await queryInterface.addColumn('Schools', 'description', {
                type: Sequelize.TEXT,
                allowNull: true,
            });
        }

        if (!table.city) {
            await queryInterface.addColumn('Schools', 'city', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }

        if (!table.status) {
            await queryInterface.addColumn('Schools', 'status', {
                type: Sequelize.ENUM('Active', 'Suspended', 'Inactive'),
                defaultValue: 'Active',
            });
        }
    },

    down: async (queryInterface, Sequelize) => {
        // We typically don't drop columns in production to avoid data loss on rollback, 
        // but strictly speaking a down migration should reverse up.
        await queryInterface.removeColumn('Schools', 'address');
        await queryInterface.removeColumn('Schools', 'phone');
        await queryInterface.removeColumn('Schools', 'website');
        await queryInterface.removeColumn('Schools', 'logoUrl');
        await queryInterface.removeColumn('Schools', 'description');
        await queryInterface.removeColumn('Schools', 'city');
        await queryInterface.removeColumn('Schools', 'status');
    }
};
