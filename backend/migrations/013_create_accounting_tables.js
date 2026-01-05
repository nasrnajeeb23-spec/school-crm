const { DataTypes } = require('sequelize');

module.exports = {
    up: async ({ context: queryInterface }) => {
        const safeAddIndex = async (table, fields, options = {}) => {
            try {
                await queryInterface.addIndex(table, fields, options);
            } catch (e) {
                const msg = String(e && e.message || '');
                if (!/already exists/i.test(msg)) throw e;
            }
        };
        // Create accounts table
        await queryInterface.createTable('accounts', {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            schoolId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'Schools',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            code: {
                type: DataTypes.STRING(20),
                allowNull: false,
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            nameEn: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            type: {
                type: DataTypes.ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'),
                allowNull: false,
            },
            parentId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'accounts',
                    key: 'id'
                },
                onDelete: 'SET NULL'
            },
            level: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            balance: {
                type: DataTypes.DECIMAL(15, 2),
                allowNull: false,
                defaultValue: 0.00,
            },
            currency: {
                type: DataTypes.STRING(3),
                allowNull: false,
                defaultValue: 'USD',
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            isSystem: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            }
        });

        // Create fiscal_periods table
        await queryInterface.createTable('fiscal_periods', {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            schoolId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'Schools',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            name: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            startDate: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
            endDate: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
            status: {
                type: DataTypes.ENUM('OPEN', 'CLOSED'),
                allowNull: false,
                defaultValue: 'OPEN',
            },
            closedAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            closedBy: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'Users',
                    key: 'id'
                }
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            }
        });

        // Create journal_entries table
        await queryInterface.createTable('journal_entries', {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            schoolId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'Schools',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            entryNumber: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },
            date: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            reference: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            referenceType: {
                type: DataTypes.ENUM('INVOICE', 'PAYMENT', 'EXPENSE', 'SALARY', 'REFUND', 'DISCOUNT', 'MANUAL'),
                allowNull: false,
                defaultValue: 'MANUAL',
            },
            referenceId: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            fiscalPeriodId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'fiscal_periods',
                    key: 'id'
                }
            },
            status: {
                type: DataTypes.ENUM('DRAFT', 'POSTED', 'REVERSED'),
                allowNull: false,
                defaultValue: 'DRAFT',
            },
            createdBy: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'Users',
                    key: 'id'
                }
            },
            postedAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            postedBy: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'Users',
                    key: 'id'
                }
            },
            reversedBy: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            reversedAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            totalDebit: {
                type: DataTypes.DECIMAL(15, 2),
                allowNull: false,
                defaultValue: 0.00,
            },
            totalCredit: {
                type: DataTypes.DECIMAL(15, 2),
                allowNull: false,
                defaultValue: 0.00,
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            }
        });

        // Create journal_entry_lines table
        await queryInterface.createTable('journal_entry_lines', {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            journalEntryId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'journal_entries',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            accountId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'accounts',
                    key: 'id'
                }
            },
            debit: {
                type: DataTypes.DECIMAL(15, 2),
                allowNull: false,
                defaultValue: 0.00,
            },
            credit: {
                type: DataTypes.DECIMAL(15, 2),
                allowNull: false,
                defaultValue: 0.00,
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            lineNumber: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            }
        });

        // Add indexes
        await safeAddIndex('accounts', ['schoolId']);
        await safeAddIndex('accounts', ['schoolId', 'code'], { unique: true });
        await safeAddIndex('accounts', ['type']);
        await safeAddIndex('accounts', ['parentId']);
        await safeAddIndex('accounts', ['isActive']);

        await safeAddIndex('fiscal_periods', ['schoolId']);
        await safeAddIndex('fiscal_periods', ['status']);
        await safeAddIndex('fiscal_periods', ['startDate', 'endDate']);

        await safeAddIndex('journal_entries', ['schoolId']);
        await safeAddIndex('journal_entries', ['schoolId', 'entryNumber'], { unique: true });
        await safeAddIndex('journal_entries', ['date']);
        await safeAddIndex('journal_entries', ['status']);
        await safeAddIndex('journal_entries', ['fiscalPeriodId']);
        await safeAddIndex('journal_entries', ['referenceType', 'referenceId']);
        await safeAddIndex('journal_entries', ['createdBy']);

        await safeAddIndex('journal_entry_lines', ['journalEntryId']);
        await safeAddIndex('journal_entry_lines', ['accountId']);
        await safeAddIndex('journal_entry_lines', ['journalEntryId', 'lineNumber'], { unique: true });

        // Add accountId to expenses table
        try {
            const tableInfo = await queryInterface.describeTable('expenses');
            if (!tableInfo.accountId) {
                await queryInterface.addColumn('expenses', 'accountId', {
                    type: DataTypes.INTEGER,
                    allowNull: true, // Allow null initially for existing records
                    references: {
                        model: 'accounts',
                        key: 'id'
                    }
                });
                await queryInterface.addIndex('expenses', ['accountId']);
            }
        } catch (e) {
            console.log('Error adding accountId to expenses:', e.message);
        }
    },

    down: async ({ context: queryInterface }) => {
        // Remove accountId from expenses
        try {
            await queryInterface.removeColumn('expenses', 'accountId');
        } catch (e) {
            console.log('Error removing accountId from expenses:', e.message);
        }

        // Drop tables in reverse order
        await queryInterface.dropTable('journal_entry_lines');
        await queryInterface.dropTable('journal_entries');
        await queryInterface.dropTable('fiscal_periods');
        await queryInterface.dropTable('accounts');
    }
};
