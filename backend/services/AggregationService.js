const { 
    SchoolStats, Student, Attendance, Invoice, Expense 
} = require('../models');
const { Op } = require('sequelize');

class AggregationService {
    /**
     * Run aggregation for a specific school and date
     * @param {number} schoolId 
     * @param {string} dateStr YYYY-MM-DD
     */
    static async aggregateDailyStats(schoolId, dateStr) {
        const date = new Date(dateStr);
        const startOfDay = new Date(dateStr); startOfDay.setHours(0,0,0,0);
        const endOfDay = new Date(dateStr); endOfDay.setHours(23,59,59,999);

        // 1. Total Students
        const totalStudents = await Student.count({ where: { schoolId } });

        // 2. Attendance (Present Students)
        const presentStudents = await Attendance.count({
            where: {
                schoolId,
                date: dateStr,
                status: 'Present'
            }
        });

        const attendanceRate = totalStudents > 0 ? (presentStudents / totalStudents) * 100 : 0;

        // 3. Financials (Revenue & Expenses for this day)
        const revenue = await Invoice.sum('amount', {
            where: {
                schoolId,
                status: 'PAID',
                updatedAt: { [Op.between]: [startOfDay, endOfDay] } // Assuming payment marks invoice as paid today
            }
        }) || 0;

        const expenses = await Expense.sum('amount', {
            where: {
                schoolId,
                date: dateStr
            }
        }) || 0;

        // 4. New Admissions
        const newAdmissions = await Student.count({
            where: {
                schoolId,
                createdAt: { [Op.between]: [startOfDay, endOfDay] }
            }
        });

        // Save to DB
        const [stats, created] = await SchoolStats.findOrCreate({
            where: { schoolId, date: dateStr },
            defaults: {
                totalStudents,
                presentStudents,
                attendanceRate,
                totalRevenue: revenue,
                totalExpenses: expenses,
                newAdmissions
            }
        });

        if (!created) {
            await stats.update({
                totalStudents,
                presentStudents,
                attendanceRate,
                totalRevenue: revenue,
                totalExpenses: expenses,
                newAdmissions
            });
        }

        return stats;
    }

    /**
     * Aggregate for all schools for a specific date
     */
    static async aggregateAllSchools(dateStr) {
        const schools = await require('../models').School.findAll({ attributes: ['id'] });
        console.log(`Starting aggregation for ${schools.length} schools on ${dateStr}...`);
        
        for (const school of schools) {
            try {
                await this.aggregateDailyStats(school.id, dateStr);
            } catch (err) {
                console.error(`Failed to aggregate for school ${school.id}:`, err.message);
            }
        }
        console.log('Aggregation complete.');
    }
}

module.exports = AggregationService;
