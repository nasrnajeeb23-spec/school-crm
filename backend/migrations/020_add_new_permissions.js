const { DataTypes } = require('sequelize');

function permId(key) {
    return `perm_${String(key || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_')}`;
}

module.exports = {
    up: async ({ sequelize, queryInterface }) => {
        const dialect = sequelize.getDialect();
        const transaction = await sequelize.transaction();
        try {
            // New permissions to add
            const newPermissions = [
                // DELETE permissions
                { key: 'DELETE_STUDENTS', name: 'Delete Students', description: 'Permission to delete students' },
                { key: 'DELETE_TEACHERS', name: 'Delete Teachers', description: 'Permission to delete teachers' },
                { key: 'DELETE_PARENTS', name: 'Delete Parents', description: 'Permission to delete parents' },
                { key: 'DELETE_CLASSES', name: 'Delete Classes', description: 'Permission to delete classes' },
                { key: 'DELETE_STAFF', name: 'Delete Staff', description: 'Permission to delete staff members' },

                // EXPORT permissions
                { key: 'EXPORT_REPORTS', name: 'Export Reports', description: 'Permission to export reports' },
                { key: 'EXPORT_STUDENTS', name: 'Export Students', description: 'Permission to export student data' },
                { key: 'EXPORT_FINANCE', name: 'Export Finance', description: 'Permission to export financial data' },
                { key: 'EXPORT_DATA', name: 'Export Data', description: 'Permission to export general data' },

                // IMPORT permissions
                { key: 'IMPORT_DATA', name: 'Import Data', description: 'Permission to import data into the system' },
                { key: 'IMPORT_STUDENTS', name: 'Import Students', description: 'Permission to bulk import students' },
                { key: 'IMPORT_TEACHERS', name: 'Import Teachers', description: 'Permission to bulk import teachers' },

                // BULK operations
                { key: 'BULK_OPERATIONS', name: 'Bulk Operations', description: 'Permission to perform bulk operations' },
                { key: 'BULK_DELETE', name: 'Bulk Delete', description: 'Permission to delete multiple records at once' },
                { key: 'BULK_UPDATE', name: 'Bulk Update', description: 'Permission to update multiple records at once' },
            ];

            // Insert new permissions
            for (const perm of newPermissions) {
                const id = permId(perm.key);
                if (dialect === 'sqlite') {
                    await sequelize.query(
                        'INSERT OR IGNORE INTO RbacPermissions(id, key, name, description, isSystem, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
                        { replacements: [id, perm.key, perm.name, perm.description, 1], transaction }
                    );
                } else {
                    await sequelize.query(
                        'INSERT INTO "RbacPermissions"(id, key, name, description, "isSystem", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,NOW(),NOW()) ON CONFLICT (key) DO NOTHING',
                        { bind: [id, perm.key, perm.name, perm.description, true], transaction }
                    );
                }
            }

            await transaction.commit();
            console.log('✅ New permissions added successfully');
        } catch (e) {
            await transaction.rollback();
            console.error('❌ Error adding new permissions:', e.message);
            throw e;
        }
    },

    down: async ({ sequelize, queryInterface }) => {
        const transaction = await sequelize.transaction();
        try {
            const keysToRemove = [
                'DELETE_STUDENTS', 'DELETE_TEACHERS', 'DELETE_PARENTS', 'DELETE_CLASSES', 'DELETE_STAFF',
                'EXPORT_REPORTS', 'EXPORT_STUDENTS', 'EXPORT_FINANCE', 'EXPORT_DATA',
                'IMPORT_DATA', 'IMPORT_STUDENTS', 'IMPORT_TEACHERS',
                'BULK_OPERATIONS', 'BULK_DELETE', 'BULK_UPDATE'
            ];

            const dialect = sequelize.getDialect();
            if (dialect === 'sqlite') {
                for (const key of keysToRemove) {
                    await sequelize.query(
                        'DELETE FROM RbacPermissions WHERE key = ?',
                        { replacements: [key], transaction }
                    );
                }
            } else {
                await sequelize.query(
                    'DELETE FROM "RbacPermissions" WHERE key = ANY($1)',
                    { bind: [keysToRemove], transaction }
                );
            }

            await transaction.commit();
            console.log('✅ New permissions removed successfully');
        } catch (e) {
            await transaction.rollback();
            console.error('❌ Error removing new permissions:', e.message);
            throw e;
        }
    }
};
