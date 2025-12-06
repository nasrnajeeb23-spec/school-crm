const PDFDocument = require('pdfkit');
const { Student, Grade, Class, School, Attendance } = require('../models');
const fs = require('fs');
const path = require('path');

class ReportService {
  /**
   * Generate a Student Report Card PDF
   * @param {string} studentId 
   * @param {string} schoolId 
   * @returns {Promise<Buffer>} PDF Buffer
   */
  static async generateReportCard(studentId, schoolId) {
    return new Promise(async (resolve, reject) => {
      try {
        const student = await Student.findByPk(studentId, {
          include: [{ model: Class }]
        });
        
        if (!student) throw new Error('Student not found');
        if (Number(student.schoolId) !== Number(schoolId)) throw new Error('Access denied');

        const grades = await Grade.findAll({
          where: { studentId },
          order: [['subject', 'ASC']]
        });

        const school = await School.findByPk(schoolId);

        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Header
        doc.fontSize(20).text(school ? school.name : 'School Report Card', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Student Name: ${student.name}`, { align: 'right' });
        doc.text(`Grade: ${student.grade}`, { align: 'right' });
        if (student.Class) {
            doc.text(`Class: ${student.Class.gradeLevel} - ${student.Class.section || ''}`, { align: 'right' });
        }
        doc.text(`Date: ${new Date().toLocaleDateString('ar-SA')}`, { align: 'right' });
        doc.moveDown(2);

        // Table Header
        const startY = doc.y;
        const col1 = 400; // Subject
        const col2 = 300; // Homework
        const col3 = 240; // Quiz
        const col4 = 180; // Midterm
        const col5 = 120; // Final
        const col6 = 60;  // Total

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Subject', col1, startY, { width: 100, align: 'right' });
        doc.text('HW', col2, startY, { width: 50, align: 'center' });
        doc.text('Quiz', col3, startY, { width: 50, align: 'center' });
        doc.text('Mid', col4, startY, { width: 50, align: 'center' });
        doc.text('Final', col5, startY, { width: 50, align: 'center' });
        doc.text('Total', col6, startY, { width: 50, align: 'center' });
        
        doc.moveTo(50, doc.y + 15).lineTo(550, doc.y + 15).stroke();
        doc.font('Helvetica');
        doc.moveDown();

        // Rows
        let totalSum = 0;
        let count = 0;

        for (const grade of grades) {
          const y = doc.y;
          doc.text(grade.subject, col1, y, { width: 100, align: 'right' });
          doc.text(String(grade.homework || 0), col2, y, { width: 50, align: 'center' });
          doc.text(String(grade.quiz || 0), col3, y, { width: 50, align: 'center' });
          doc.text(String(grade.midterm || 0), col4, y, { width: 50, align: 'center' });
          doc.text(String(grade.final || 0), col5, y, { width: 50, align: 'center' });
          
          const total = (grade.homework||0) + (grade.quiz||0) + (grade.midterm||0) + (grade.final||0);
          doc.text(String(total), col6, y, { width: 50, align: 'center' });
          
          totalSum += total;
          count++;
          doc.moveDown();
        }

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Summary
        const average = count > 0 ? (totalSum / count).toFixed(2) : 0;
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`Average: ${average}%`, { align: 'left' });

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = ReportService;
