const PDFDocument = require('pdfkit');
const { Student, Grade, Class, School, Attendance } = require('../models');
const fs = require('fs');
const path = require('path');
const { processArabic } = require('../utils/arabic');

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
        const fontPath = path.join(__dirname, '../assets/fonts/arial.ttf');

        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Register Font
        if (fs.existsSync(fontPath)) {
            doc.font(fontPath);
        } else {
            console.warn('Arabic font not found, falling back to default');
        }

        // Header
        const schoolName = processArabic(school ? school.name : 'تقرير المدرسة');
        doc.fontSize(20).text(schoolName, { align: 'center' });
        doc.moveDown();

        const studentLabel = processArabic('اسم الطالب:');
        const studentName = processArabic(student.name);
        const gradeLabel = processArabic('الصف:');
        const gradeValue = processArabic(student.grade || '');
        const dateLabel = processArabic('التاريخ:');
        const dateValue = processArabic(new Date().toLocaleDateString('ar-SA'));

        doc.fontSize(12);
        // RTL alignment manually (Text, X, Y)
        // PDFKit writes LTR, so we put the label on the right and value to its left
        
        let y = doc.y;
        doc.text(studentLabel, 500, y, { align: 'right' }); 
        doc.text(studentName, 300, y, { align: 'right', width: 190 });
        
        doc.moveDown();
        y = doc.y;
        doc.text(gradeLabel, 500, y, { align: 'right' });
        doc.text(gradeValue, 300, y, { align: 'right', width: 190 });

        if (student.Class) {
            const classLabel = processArabic('الفصل:');
            const classValue = processArabic(`${student.Class.gradeLevel} - ${student.Class.section || ''}`);
            doc.moveDown();
            y = doc.y;
            doc.text(classLabel, 500, y, { align: 'right' });
            doc.text(classValue, 300, y, { align: 'right', width: 190 });
        }

        doc.moveDown();
        y = doc.y;
        doc.text(dateLabel, 500, y, { align: 'right' });
        doc.text(dateValue, 300, y, { align: 'right', width: 190 });

        doc.moveDown(2);

        // Table Header
        const startY = doc.y;
        const col1 = 400; // Subject (Right aligned)
        const col2 = 320; // HW
        const col3 = 260; // Quiz
        const col4 = 200; // Mid
        const col5 = 140; // Final
        const col6 = 80;  // Total

        doc.fontSize(10);
        
        doc.text(processArabic('المادة'), col1, startY, { width: 100, align: 'right' });
        doc.text(processArabic('واجبات'), col2, startY, { width: 50, align: 'center' });
        doc.text(processArabic('اختبار'), col3, startY, { width: 50, align: 'center' });
        doc.text(processArabic('نصفي'), col4, startY, { width: 50, align: 'center' });
        doc.text(processArabic('نهائي'), col5, startY, { width: 50, align: 'center' });
        doc.text(processArabic('المجموع'), col6, startY, { width: 50, align: 'center' });
        
        doc.moveTo(50, doc.y + 15).lineTo(550, doc.y + 15).stroke();
        doc.moveDown();

        // Rows
        let totalSum = 0;
        let count = 0;

        for (const grade of grades) {
          doc.moveDown(0.5);
          const y = doc.y;
          doc.text(processArabic(grade.subject), col1, y, { width: 100, align: 'right' });
          doc.text(String(grade.homework || 0), col2, y, { width: 50, align: 'center' });
          doc.text(String(grade.quiz || 0), col3, y, { width: 50, align: 'center' });
          doc.text(String(grade.midterm || 0), col4, y, { width: 50, align: 'center' });
          doc.text(String(grade.final || 0), col5, y, { width: 50, align: 'center' });
          
          const total = (grade.homework||0) + (grade.quiz||0) + (grade.midterm||0) + (grade.final||0);
          doc.text(String(total), col6, y, { width: 50, align: 'center' });
          
          totalSum += total;
          count++;
        }

        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Summary
        const average = count > 0 ? (totalSum / count).toFixed(2) : 0;
        doc.fontSize(12);
        const avgText = processArabic(`المعدل العام: ${average}%`);
        doc.text(avgText, 50, doc.y, { align: 'left' }); // Arabic reversed is tricky with numbers mixed

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = ReportService;
