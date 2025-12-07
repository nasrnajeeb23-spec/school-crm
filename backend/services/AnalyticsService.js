const { Op } = require('sequelize');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Payment = require('../models/Payment');
const { linearRegression, correlationCoefficient } = require('simple-statistics');

class AnalyticsService {
  /**
   * Predict students at risk of dropping out or failing
   */
  async predictAtRiskStudents(schoolId, options = {}) {
    const { startDate, endDate, threshold = 0.7 } = options;
    
    try {
      // Get all active students
      const students = await Student.findAll({
        where: { 
          schoolId,
          status: 'Active'
        },
        include: [
          {
            model: Attendance,
            where: {
              date: {
                [Op.between]: [startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), endDate || new Date()]
              }
            },
            required: false
          },
          {
            model: Grade,
            where: {
              date: {
                [Op.between]: [startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), endDate || new Date()]
              }
            },
            required: false
          }
        ]
      });

      const predictions = students.map(student => {
        const attendanceRate = this.calculateAttendanceRate(student.Attendances);
        const averageGrade = this.calculateAverageGrade(student.Grades);
        const gradeTrend = this.calculateGradeTrend(student.Grades);
        
        // Risk factors (0-1 scale, where 1 is highest risk)
        const riskFactors = {
          lowAttendance: attendanceRate < 0.8 ? (0.8 - attendanceRate) / 0.8 : 0,
          decliningGrades: gradeTrend < -0.1 ? Math.abs(gradeTrend) * 5 : 0,
          lowGrades: averageGrade < 60 ? (60 - averageGrade) / 60 : 0,
          recentAbsences: this.hasRecentAbsences(student.Attendances) ? 0.3 : 0
        };
        
        // Calculate overall risk score
        const weights = { lowAttendance: 0.3, decliningGrades: 0.3, lowGrades: 0.25, recentAbsences: 0.15 };
        const riskScore = Object.keys(riskFactors).reduce((score, factor) => {
          return score + (riskFactors[factor] * weights[factor]);
        }, 0);

        return {
          studentId: student.id,
          studentName: student.name,
          grade: student.grade,
          riskScore: Math.min(riskScore, 1),
          riskLevel: this.getRiskLevel(riskScore),
          factors: riskFactors,
          recommendations: this.generateRecommendations(riskFactors),
          attendanceRate,
          averageGrade,
          gradeTrend
        };
      });

      // Filter students above threshold
      return predictions.filter(p => p.riskScore >= threshold).sort((a, b) => b.riskScore - a.riskScore);
    } catch (error) {
      throw new Error(`Failed to predict at-risk students: ${error.message}`);
    }
  }

  /**
   * Analyze academic performance trends
   */
  async analyzeAcademicTrends(schoolId, options = {}) {
    const { subject, gradeLevel, startDate, endDate } = options;
    
    try {
      const whereClause = { schoolId };
      if (subject) whereClause.assignment = { [Op.like]: `%${subject}%` };
      
      const grades = await Grade.findAll({
        where: whereClause,
        include: [
          {
            model: Student,
            where: gradeLevel ? { grade: gradeLevel } : {},
            attributes: ['id', 'name', 'grade']
          },
          {
            model: Class,
            attributes: ['id', 'name', 'gradeLevel']
          }
        ],
        order: [['date', 'ASC']]
      });

      // Group by time periods
      const monthlyTrends = this.groupByMonth(grades);
      const subjectTrends = this.groupBySubject(grades);
      const classTrends = this.groupByClass(grades);
      
      // Calculate statistical insights
      const insights = {
        overallTrend: this.calculateOverallTrend(grades),
        bestPerformingSubjects: this.getBestPerformingSubjects(subjectTrends),
        strugglingStudents: this.identifyStrugglingStudents(grades),
        topPerformers: this.identifyTopPerformers(grades),
        gradeDistribution: this.calculateGradeDistribution(grades),
        correlationAnalysis: this.performCorrelationAnalysis(grades)
      };

      return {
        monthlyTrends,
        subjectTrends,
        classTrends,
        insights,
        summary: {
          totalGrades: grades.length,
          averageGrade: grades.reduce((sum, g) => sum + g.grade, 0) / grades.length,
          gradeCountByLevel: this.countByGradeLevel(grades)
        }
      };
    } catch (error) {
      throw new Error(`Failed to analyze academic trends: ${error.message}`);
    }
  }

  /**
   * Financial analytics and predictions
   */
  async analyzeFinancialTrends(schoolId, options = {}) {
    const { startDate, endDate, includePredictions = true } = options;
    
    try {
      const payments = await Payment.findAll({
        include: [{
          model: require('../models/Invoice'),
          include: [{ model: require('../models/Student'), where: { schoolId }, attributes: ['id'] }]
        }],
        where: {
          paymentDate: {
            [Op.between]: [startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), endDate || new Date()]
          }
        },
        order: [['paymentDate', 'ASC']]
      });

      const monthlyRevenue = this.groupPaymentsByMonth(payments);
      const paymentMethods = this.groupByPaymentMethod(payments);
      const overdueAnalysis = await this.analyzeOverduePaymentsBySchool(schoolId, startDate, endDate);
      
      let predictions = null;
      if (includePredictions && monthlyRevenue.length >= 6) {
        predictions = this.predictRevenue(monthlyRevenue);
      }

      return {
        monthlyRevenue,
        paymentMethods,
        overdueAnalysis,
        predictions,
        summary: {
          totalRevenue: payments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
          averageMonthlyRevenue: this.calculateAverageMonthlyRevenue(monthlyRevenue),
          growthRate: this.calculateRevenueGrowthRate(monthlyRevenue),
          collectionRate: this.calculateCollectionRate(payments)
        }
      };
    } catch (error) {
      throw new Error(`Failed to analyze financial trends: ${error.message}`);
    }
  }

  async analyzeAcademicPerformance(schoolId, timeRange = 'month') {
    const now = new Date();
    const rangeMap = { week: 7, month: 30, quarter: 90, year: 365 };
    const days = rangeMap[timeRange] || 30;
    const startDate = new Date(Date.now() - days*24*60*60*1000);
    const trends = await this.analyzeAcademicTrends(schoolId, { startDate, endDate: now });
    const averageGrade = trends.summary.averageGrade || 0;
    const gradeDistribution = trends.insights.gradeDistribution || [];
    const improvementTrend = trends.insights.overallTrend || 0;
    const topPerformers = trends.insights.topPerformers || [];
    const needsAttention = trends.insights.strugglingStudents || [];
    return { averageGrade, gradeDistribution, improvementTrend, topPerformers, needsAttention };
  }

  async generateAutomatedInsights(schoolId, options = {}) {
    const res = await this.generateInsights(schoolId, options);
    return res.insights;
  }

  async getDashboardOverview(schoolId) {
    const [studentCount, teacherCount, attendanceRows, gradeRows, payments] = await Promise.all([
      require('../models/Student').count({ where: { schoolId } }),
      require('../models/Teacher').count({ where: { schoolId } }),
      require('../models/Attendance').findAll({ include: [{ model: require('../models/Class'), attributes: [] }], where: { date: { [Op.between]: [new Date(Date.now()-30*24*60*60*1000), new Date()] } } }),
      require('../models/Grade').findAll({ include: [{ model: require('../models/Student'), where: { schoolId }, attributes: [] }], where: { date: { [Op.between]: [new Date(Date.now()-30*24*60*60*1000), new Date()] } } }),
      Payment.findAll({ include: [{ model: require('../models/Invoice'), include: [{ model: require('../models/Student'), where: { schoolId }, attributes: [] }] }], where: { paymentDate: { [Op.between]: [new Date(Date.now()-365*24*60*60*1000), new Date()] } } })
    ]);
    const attendanceRate = attendanceRows.length ? (attendanceRows.filter(a => a.status === 'Present').length / attendanceRows.length) : 1;
    const averageGrade = gradeRows.length ? (gradeRows.reduce((s,g)=>s+(g.grade||0),0)/gradeRows.length) : 0;
    const financialHealth = payments.reduce((s,p)=>s+parseFloat(p.amount||0),0);
    return {
      totalStudents: studentCount,
      totalTeachers: teacherCount,
      attendanceRate,
      averageGrade,
      financialHealth,
      operationalEfficiency: Math.min(1, attendanceRate * 0.5 + (averageGrade/100) * 0.5),
      studentGrowth: [],
      academicImprovement: [],
      financialStability: []
    };
  }

  async predictEnrollmentTrends(schoolId, months = 6) {
    const Student = require('../models/Student');
    const rows = await Student.findAll({ where: { schoolId }, order: [['registrationDate','ASC']] });
    const byMonth = {};
    rows.forEach(r=>{ const m = new Date(r.registrationDate).toISOString().slice(0,7); byMonth[m]=(byMonth[m]||0)+1; });
    const series = Object.keys(byMonth).sort().map((m,i)=>({ x: i, y: byMonth[m] }));
    const lr = series.length ? linearRegression(series.map(p=>[p.x,p.y])) : { m: 0, b: series.length?series[0].y:0 };
    const predictions = Array.from({length: months}).map((_,i)=>({ monthIndex: i+1, expectedEnrollments: Math.max(0, Math.round(lr.m*(series.length+i)+lr.b)) }));
    return { predictions, factors: ['Seasonality','Marketing','Retention'], recommendations: ['Boost outreach','Offer early enrollment discounts'] };
  }

  async getSystemAlerts(schoolId, severity = 'all') {
    const Invoice = require('../models/Invoice');
    const Student = require('../models/Student');
    const overdue = await Invoice.count({ include: [{ model: Student, where: { schoolId } }], where: { status: 'OVERDUE' } });
    const alerts = [];
    if (overdue > 0) alerts.push({ id: 'al_'+Date.now(), severity: 'critical', acknowledged: false, message: `There are ${overdue} overdue invoices` });
    return severity==='all' ? alerts : alerts.filter(a=>a.severity===severity);
  }

  // --- Helpers for financial analysis ---
  groupPaymentsByMonth(payments){
    const map={};
    payments.forEach(p=>{ const m = new Date(p.paymentDate).toISOString().slice(0,7); map[m]=(map[m]||0)+parseFloat(p.amount); });
    return Object.keys(map).sort().map(m=>({ month:m, amount: map[m] }));
  }
  groupByPaymentMethod(payments){
    const map={};
    payments.forEach(p=>{ const k=p.paymentMethod||'Unknown'; map[k]=(map[k]||0)+parseFloat(p.amount); });
    return Object.keys(map).map(k=>({ method:k, total: map[k] }));
  }
  async analyzeOverduePaymentsBySchool(schoolId, startDate, endDate){
    const Invoice = require('../models/Invoice');
    const Student = require('../models/Student');
    const rows = await Invoice.findAll({ include: [{ model: Student, where: { schoolId } }], where: { dueDate: { [Op.between]: [startDate || new Date(Date.now()-365*24*60*60*1000), endDate || new Date()] }, status: 'OVERDUE' } });
    const amount = rows.reduce((s,r)=>s+parseFloat(r.amount),0);
    return { overdueCount: rows.length, overdueAmount: amount };
  }
  calculateAverageMonthlyRevenue(monthly){ if (!monthly.length) return 0; return monthly.reduce((s,m)=>s+m.amount,0)/monthly.length; }
  calculateRevenueGrowthRate(monthly){ if (monthly.length<2) return 0; const first=monthly[0].amount; const last=monthly[monthly.length-1].amount; return (last-first)/(first||1); }
  calculateCollectionRate(payments){ const total=payments.reduce((s,p)=>s+parseFloat(p.amount||0),0); return total>0?1:0; }
  predictRevenue(monthly){ const series = monthly.map((m,i)=>({x:i,y:m.amount})); const lr = series.length ? linearRegression(series.map(p=>[p.x,p.y])) : { m:0,b:0 }; return Array.from({length:3}).map((_,i)=>({ monthIndex: monthly.length+i+1, expectedRevenue: Math.max(0, Math.round(lr.m*(monthly.length+i)+lr.b)) })); }

  /**
   * Teacher performance analytics
   */
  async analyzeTeacherPerformance(schoolId, options = {}) {
    const { startDate, endDate } = options;
    
    try {
      const teachers = await Teacher.findAll({
        where: { schoolId },
        include: [
          {
            model: Class,
            as: 'Classes',
            include: [
              {
                model: Student,
                as: 'Students',
                include: [
                  {
                    model: Grade,
                    where: {
                      date: {
                        [Op.between]: [startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), endDate || new Date()]
                      }
                    },
                    required: false
                  }
                ]
              }
            ]
          }
        ]
      });

      const performanceData = teachers.map(teacher => {
        const allGrades = teacher.Classes.flatMap(c => 
          c.Students.flatMap(s => s.Grades)
        );
        
        return {
          teacherId: teacher.id,
          teacherName: teacher.name,
          subject: teacher.subject,
          averageGrade: this.calculateAverageGrade(allGrades),
          studentCount: teacher.Classes.reduce((sum, c) => sum + c.Students.length, 0),
          classCount: teacher.Classes.length,
          gradeDistribution: this.calculateGradeDistribution(allGrades),
          performanceTrend: this.calculateTeacherTrend(allGrades)
        };
      });

      return {
        teachers: performanceData,
        summary: {
          topPerformers: performanceData.sort((a, b) => b.averageGrade - a.averageGrade).slice(0, 5),
          subjectPerformance: this.aggregateBySubject(performanceData),
          overallAverage: performanceData.reduce((sum, t) => sum + t.averageGrade, 0) / performanceData.length
        }
      };
    } catch (error) {
      throw new Error(`Failed to analyze teacher performance: ${error.message}`);
    }
  }

  /**
   * Generate automated insights and recommendations
   */
  async generateInsights(schoolId, options = {}) {
    try {
      const [atRiskStudents, academicTrends, financialTrends, teacherPerformance] = await Promise.all([
        this.predictAtRiskStudents(schoolId, options),
        this.analyzeAcademicTrends(schoolId, options),
        this.analyzeFinancialTrends(schoolId, options),
        this.analyzeTeacherPerformance(schoolId, options)
      ]);

      const insights = [
        ...this.generateAcademicInsights(academicTrends, atRiskStudents),
        ...this.generateFinancialInsights(financialTrends),
        ...this.generateTeacherInsights(teacherPerformance),
        ...this.generateOperationalInsights(atRiskStudents, academicTrends)
      ];

      return {
        insights,
        priority: this.prioritizeInsights(insights),
        timestamp: new Date(),
        schoolId,
        summary: {
          totalInsights: insights.length,
          highPriority: insights.filter(i => i.priority === 'high').length,
          mediumPriority: insights.filter(i => i.priority === 'medium').length,
          lowPriority: insights.filter(i => i.priority === 'low').length
        }
      };
    } catch (error) {
      throw new Error(`Failed to generate insights: ${error.message}`);
    }
  }

  /**
   * Generate a consolidated report for the requested type
   */
  async generateReport(schoolId, reportType = 'operational', format = 'pdf', dateRange = {}) {
    const range = {
      startDate: dateRange?.startDate || new Date(Date.now() - 30*24*60*60*1000),
      endDate: dateRange?.endDate || new Date()
    };
    let payload;
    if (reportType === 'academic') {
      payload = await this.analyzeAcademicTrends(schoolId, range);
    } else if (reportType === 'financial') {
      payload = await this.analyzeFinancialTrends(schoolId, range);
    } else if (reportType === 'teacher') {
      payload = await this.analyzeTeacherPerformance(schoolId, range);
    } else {
      const insights = await this.generateInsights(schoolId, range);
      payload = insights;
    }
    const downloadUrl = `/downloads/${reportType}-report-${schoolId}-${Date.now()}.${format === 'excel' ? 'xlsx' : (format === 'csv' ? 'csv' : 'pdf')}`;
    const expiresAt = new Date(Date.now() + 24*60*60*1000);
    return { downloadUrl, expiresAt, payload, reportType, format };
  }

  // Helper methods
  calculateAttendanceRate(attendances) {
    if (!attendances || attendances.length === 0) return 1;
    const present = attendances.filter(a => a.status === 'Present').length;
    return present / attendances.length;
  }

  calculateAverageGrade(grades) {
    if (!grades || grades.length === 0) return 100;
    return grades.reduce((sum, g) => sum + g.grade, 0) / grades.length;
  }

  calculateGradeTrend(grades) {
    if (!grades || grades.length < 3) return 0;
    
    const sortedGrades = grades.sort((a, b) => new Date(a.date) - new Date(b.date));
    const recentGrades = sortedGrades.slice(-5); // Last 5 grades
    
    const x = recentGrades.map((_, i) => i);
    const y = recentGrades.map(g => g.grade);
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  hasRecentAbsences(attendances) {
    if (!attendances || attendances.length === 0) return false;
    
    const recentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return attendances.some(a => 
      new Date(a.date) >= recentDate && a.status === 'Absent'
    );
  }

  getRiskLevel(score) {
    if (score >= 0.8) return 'Critical';
    if (score >= 0.6) return 'High';
    if (score >= 0.4) return 'Medium';
    return 'Low';
  }

  generateRecommendations(riskFactors) {
    const recommendations = [];
    
    if (riskFactors.lowAttendance > 0.3) {
      recommendations.push('Schedule parent meeting to discuss attendance improvement plan');
      recommendations.push('Implement daily check-in system');
    }
    
    if (riskFactors.decliningGrades > 0.2) {
      recommendations.push('Arrange tutoring sessions');
      recommendations.push('Conduct learning style assessment');
    }
    
    if (riskFactors.lowGrades > 0.3) {
      recommendations.push('Provide additional academic support');
      recommendations.push('Consider grade recovery programs');
    }
    
    return recommendations;
  }

  groupByMonth(data) {
    const grouped = {};
    data.forEach(item => {
      const month = new Date(item.date).toISOString().slice(0, 7);
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(item);
    });
    return Object.keys(grouped).map(month => ({
      month,
      data: grouped[month],
      average: grouped[month].reduce((sum, item) => sum + (item.grade || 0), 0) / grouped[month].length
    }));
  }

  groupBySubject(grades) {
    const grouped = {};
    grades.forEach(grade => {
      const subject = grade.assignment.split(' ')[0] || 'General';
      if (!grouped[subject]) grouped[subject] = [];
      grouped[subject].push(grade);
    });
    return Object.keys(grouped).map(subject => ({
      subject,
      average: grouped[subject].reduce((sum, g) => sum + g.grade, 0) / grouped[subject].length,
      count: grouped[subject].length
    }));
  }

  groupByClass(grades) {
    const grouped = {};
    grades.forEach(grade => {
      const className = grade.Class?.name || 'Unknown';
      if (!grouped[className]) grouped[className] = [];
      grouped[className].push(grade);
    });
    return Object.keys(grouped).map(className => ({
      className,
      average: grouped[className].reduce((sum, g) => sum + g.grade, 0) / grouped[className].length,
      count: grouped[className].length
    }));
  }

  generateAcademicInsights(academicTrends, atRiskStudents) {
    const insights = [];
    
    if (atRiskStudents.length > 0) {
      insights.push({
        type: 'academic',
        priority: 'high',
        title: `${atRiskStudents.length} students at risk`,
        description: 'Students identified as needing immediate intervention',
        data: atRiskStudents,
        action: 'Review at-risk student dashboard'
      });
    }
    
    if (academicTrends.overallTrend < -0.1) {
      insights.push({
        type: 'academic',
        priority: 'medium',
        title: 'Declining academic performance',
        description: 'Overall school performance is trending downward',
        data: { trend: academicTrends.overallTrend },
        action: 'Analyze teaching methods and curriculum'
      });
    }
    
    return insights;
  }

  generateFinancialInsights(financialTrends) {
    const insights = [];
    
    if (financialTrends.overdueAnalysis.overdueAmount > 10000) {
      insights.push({
        type: 'financial',
        priority: 'high',
        title: 'High overdue payments',
        description: `Over $${financialTrends.overdueAnalysis.overdueAmount} in overdue payments`,
        data: financialTrends.overdueAnalysis,
        action: 'Implement collection strategy'
      });
    }
    
    if (financialTrends.summary.growthRate < 0) {
      insights.push({
        type: 'financial',
        priority: 'medium',
        title: 'Revenue decline',
        description: 'Monthly revenue is decreasing',
        data: { growthRate: financialTrends.summary.growthRate },
        action: 'Review pricing strategy and retention'
      });
    }
    
    return insights;
  }

  generateTeacherInsights(teacherPerformance) {
    const insights = [];
    
    const lowPerformers = teacherPerformance.teachers.filter(t => t.averageGrade < 70);
    if (lowPerformers.length > 0) {
      insights.push({
        type: 'teacher',
        priority: 'medium',
        title: 'Teachers needing support',
        description: `${lowPerformers.length} teachers have below-average performance`,
        data: lowPerformers,
        action: 'Provide professional development'
      });
    }
    
    return insights;
  }

  generateOperationalInsights(atRiskStudents, academicTrends) {
    const insights = [];
    
    const riskRate = atRiskStudents.length / 100; // Assuming 100 students total
    if (riskRate > 0.2) {
      insights.push({
        type: 'operational',
        priority: 'high',
        title: 'High student risk rate',
        description: `${((riskRate || 0) * 100).toFixed(1)}% of students are at risk`,
        data: { riskRate },
        action: 'Implement school-wide intervention program'
      });
    }
    
    return insights;
  }

  prioritizeInsights(insights) {
    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}

module.exports = new AnalyticsService();