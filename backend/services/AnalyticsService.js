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
        where: { 
          schoolId,
          date: {
            [Op.between]: [startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), endDate || new Date()]
          }
        },
        order: [['date', 'ASC']]
      });

      const monthlyRevenue = this.groupPaymentsByMonth(payments);
      const paymentMethods = this.groupByPaymentMethod(payments);
      const overdueAnalysis = this.analyzeOverduePayments(payments);
      
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
        description: `${(riskRate * 100).toFixed(1)}% of students are at risk`,
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