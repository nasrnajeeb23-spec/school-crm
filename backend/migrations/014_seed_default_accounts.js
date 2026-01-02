const { DataTypes } = require('sequelize');

module.exports = {
    up: async ({ context: queryInterface }) => {
        const { sequelize } = queryInterface;

        // Get all schools
        const schools = await sequelize.query(
            'SELECT id FROM "Schools"',
            { type: sequelize.QueryTypes.SELECT }
        );

        if (schools.length === 0) {
            console.log('No schools found, skipping default accounts seed');
            return;
        }

        // Default chart of accounts structure
        const defaultAccounts = [
            // 1000 - Assets
            { code: '1000', name: 'الأصول', nameEn: 'Assets', type: 'ASSET', level: 1, parentId: null, isSystem: true },
            { code: '1100', name: 'الأصول المتداولة', nameEn: 'Current Assets', type: 'ASSET', level: 2, parentCode: '1000', isSystem: true },
            { code: '1110', name: 'النقدية بالصندوق', nameEn: 'Cash', type: 'ASSET', level: 3, parentCode: '1100', isSystem: true },
            { code: '1120', name: 'النقدية بالبنك', nameEn: 'Bank', type: 'ASSET', level: 3, parentCode: '1100', isSystem: true },
            { code: '1130', name: 'الذمم المدينة', nameEn: 'Accounts Receivable', type: 'ASSET', level: 3, parentCode: '1100', isSystem: true },
            { code: '1140', name: 'السلف للموظفين', nameEn: 'Employee Advances', type: 'ASSET', level: 3, parentCode: '1100', isSystem: true },
            { code: '1200', name: 'الأصول الثابتة', nameEn: 'Fixed Assets', type: 'ASSET', level: 2, parentCode: '1000', isSystem: true },
            { code: '1210', name: 'المباني', nameEn: 'Buildings', type: 'ASSET', level: 3, parentCode: '1200', isSystem: false },
            { code: '1220', name: 'الأثاث', nameEn: 'Furniture', type: 'ASSET', level: 3, parentCode: '1200', isSystem: false },
            { code: '1230', name: 'المعدات', nameEn: 'Equipment', type: 'ASSET', level: 3, parentCode: '1200', isSystem: false },

            // 2000 - Liabilities
            { code: '2000', name: 'الخصوم', nameEn: 'Liabilities', type: 'LIABILITY', level: 1, parentId: null, isSystem: true },
            { code: '2100', name: 'الخصوم المتداولة', nameEn: 'Current Liabilities', type: 'LIABILITY', level: 2, parentCode: '2000', isSystem: true },
            { code: '2110', name: 'الذمم الدائنة', nameEn: 'Accounts Payable', type: 'LIABILITY', level: 3, parentCode: '2100', isSystem: true },
            { code: '2120', name: 'الرواتب المستحقة', nameEn: 'Salaries Payable', type: 'LIABILITY', level: 3, parentCode: '2100', isSystem: true },
            { code: '2130', name: 'الخصومات المستحقة', nameEn: 'Deductions Payable', type: 'LIABILITY', level: 3, parentCode: '2100', isSystem: true },

            // 3000 - Equity
            { code: '3000', name: 'حقوق الملكية', nameEn: 'Equity', type: 'EQUITY', level: 1, parentId: null, isSystem: true },
            { code: '3100', name: 'رأس المال', nameEn: 'Capital', type: 'EQUITY', level: 2, parentCode: '3000', isSystem: true },
            { code: '3200', name: 'الأرباح المحتجزة', nameEn: 'Retained Earnings', type: 'EQUITY', level: 2, parentCode: '3000', isSystem: true },

            // 4000 - Revenue
            { code: '4000', name: 'الإيرادات', nameEn: 'Revenue', type: 'REVENUE', level: 1, parentId: null, isSystem: true },
            { code: '4100', name: 'إيرادات الرسوم الدراسية', nameEn: 'Tuition Revenue', type: 'REVENUE', level: 2, parentCode: '4000', isSystem: true },
            { code: '4200', name: 'إيرادات أخرى', nameEn: 'Other Revenue', type: 'REVENUE', level: 2, parentCode: '4000', isSystem: false },

            // 5000 - Expenses
            { code: '5000', name: 'المصروفات', nameEn: 'Expenses', type: 'EXPENSE', level: 1, parentId: null, isSystem: true },
            { code: '5100', name: 'مصروف الرواتب', nameEn: 'Salary Expense', type: 'EXPENSE', level: 2, parentCode: '5000', isSystem: true },
            { code: '5200', name: 'مصروف الإيجار', nameEn: 'Rent Expense', type: 'EXPENSE', level: 2, parentCode: '5000', isSystem: false },
            { code: '5300', name: 'مصروف المرافق', nameEn: 'Utilities Expense', type: 'EXPENSE', level: 2, parentCode: '5000', isSystem: false },
            { code: '5400', name: 'مصروف القرطاسية', nameEn: 'Stationery Expense', type: 'EXPENSE', level: 2, parentCode: '5000', isSystem: false },
            { code: '5500', name: 'مصروف الصيانة', nameEn: 'Maintenance Expense', type: 'EXPENSE', level: 2, parentCode: '5000', isSystem: false },
            { code: '5600', name: 'الخصومات الممنوحة', nameEn: 'Discounts Given', type: 'EXPENSE', level: 2, parentCode: '5000', isSystem: true },
            { code: '5700', name: 'مصروفات متنوعة', nameEn: 'Miscellaneous Expenses', type: 'EXPENSE', level: 2, parentCode: '5000', isSystem: true },
        ];

        // For each school, create the default accounts
        for (const school of schools) {
            console.log(`Creating default accounts for school ${school.id}`);

            const accountMap = {}; // Map code to id for parent relationships

            // First pass: create all accounts
            for (const account of defaultAccounts) {
                const parentId = account.parentCode ? accountMap[account.parentCode] : null;

                const [result] = await sequelize.query(
                    `INSERT INTO accounts 
           ("schoolId", code, name, "nameEn", type, "parentId", level, "isActive", balance, currency, "isSystem", "createdAt", "updatedAt")
           VALUES (:schoolId, :code, :name, :nameEn, :type, :parentId, :level, true, 0, 'USD', :isSystem, NOW(), NOW())
           RETURNING id`,
                    {
                        replacements: {
                            schoolId: school.id,
                            code: account.code,
                            name: account.name,
                            nameEn: account.nameEn,
                            type: account.type,
                            parentId: parentId,
                            level: account.level,
                            isSystem: account.isSystem
                        },
                        type: sequelize.QueryTypes.INSERT
                    }
                );

                accountMap[account.code] = result[0].id;
            }

            // Update old expenses to use "Miscellaneous Expenses" account
            const miscExpenseAccountId = accountMap['5700'];
            if (miscExpenseAccountId) {
                await sequelize.query(
                    `UPDATE expenses SET "accountId" = :accountId WHERE "schoolId" = :schoolId AND "accountId" IS NULL`,
                    {
                        replacements: {
                            accountId: miscExpenseAccountId,
                            schoolId: school.id
                        },
                        type: sequelize.QueryTypes.UPDATE
                    }
                );
            }

            console.log(`Created ${defaultAccounts.length} default accounts for school ${school.id}`);
        }
    },

    down: async ({ context: queryInterface }) => {
        const { sequelize } = queryInterface;

        // Delete all system accounts
        await sequelize.query(
            'DELETE FROM accounts WHERE "isSystem" = true',
            { type: sequelize.QueryTypes.DELETE }
        );
    }
};
