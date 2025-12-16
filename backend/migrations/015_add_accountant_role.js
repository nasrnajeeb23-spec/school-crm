const { DataTypes } = require('sequelize');

module.exports = {
    up: async ({ context: queryInterface }) => {
        try {
            // Add 'Accountant' to the role enum
            await queryInterface.sequelize.query(`
        ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'Accountant';
      `);

            console.log('Successfully added Accountant role to User model');
        } catch (error) {
            console.log('Error adding Accountant role (may already exist):', error.message);
        }
    },

    down: async ({ context: queryInterface }) => {
        // Note: PostgreSQL doesn't support removing enum values easily
        // This would require recreating the enum type
        console.log('Rollback: Cannot easily remove enum value from PostgreSQL');
    }
};
