const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendPaymentReceipt(toEmail, studentName, amount, currency = '$', receiptId, date) {
    if (!toEmail) return false;

    const mailOptions = {
      from: `"School Finance" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `Payment Receipt - ${studentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
          <h2>إشعار استلام دفعة</h2>
          <p>عزيزي ولي الأمر،</p>
          <p>نود إعلامكم بأنه تم استلام دفعة مالية بنجاح.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f8f9fa;">
              <td style="padding: 10px; border: 1px solid #dee2e6;">اسم الطالب</td>
              <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>${studentName}</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #dee2e6;">المبلغ</td>
              <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>${amount} ${currency}</strong></td>
            </tr>
            <tr style="background-color: #f8f9fa;">
              <td style="padding: 10px; border: 1px solid #dee2e6;">رقم السند</td>
              <td style="padding: 10px; border: 1px solid #dee2e6;">${receiptId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #dee2e6;">التاريخ</td>
              <td style="padding: 10px; border: 1px solid #dee2e6;">${date}</td>
            </tr>
          </table>

          <p>شكراً لالتزامكم.</p>
          <p style="color: #6c757d; font-size: 12px;">هذه رسالة آلية، يرجى عدم الرد عليها.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Receipt email sent to ${toEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendInvoiceReminder(toEmail, studentName, amount, dueDate) {
    if (!toEmail) return false;

    const mailOptions = {
      from: `"School Finance" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `تذكير بموعد استحقاق الفاتورة - ${studentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
          <h2 style="color: #dc3545;">تذكير بفاتورة مستحقة</h2>
          <p>عزيزي ولي الأمر،</p>
          <p>نود تذكيركم بوجود فاتورة مستحقة الدفع خاصة بالطالب <strong>${studentName}</strong>.</p>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffeeba;">
            <p style="margin: 5px 0;"><strong>المبلغ المستحق:</strong> ${amount}</p>
            <p style="margin: 5px 0;"><strong>تاريخ الاستحقاق:</strong> ${dueDate}</p>
          </div>

          <p>يرجى المبادرة بالسداد لتجنب تراكم الرسوم.</p>
          <p>شكراً لتعاونكم.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Reminder email sent to ${toEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending reminder:', error);
      return false;
    }
  }

  async sendWelcomeEmail(toEmail, adminName, schoolName, password, loginUrl) {
    if (!toEmail) return false;

    const mailOptions = {
      from: `"SchoolSaaS Team" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `مرحباً بك في SchoolSaaS - بيانات الدخول الخاصة بك`,
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
          <h2 style="color: #0d9488;">مرحباً بك في عائلة SchoolSaaS! 🚀</h2>
          <p>عزيزي/تي <strong>${adminName}</strong>،</p>
          <p>يسعدنا انضمام مدرسة <strong>${schoolName}</strong> إلينا.</p>
          <p>لقد تم إنشاء حسابك بنجاح، وبدأت فترتك التجريبية المجانية لمدة 30 يوماً.</p>
          
          <div style="background-color: #f0fdfa; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #ccfbf1;">
            <h3 style="margin-top: 0; color: #115e59;">بيانات الدخول:</h3>
            <p style="margin: 5px 0;"><strong>رابط المنصة:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
            <p style="margin: 5px 0;"><strong>اسم المستخدم:</strong> ${toEmail}</p>
            <p style="margin: 5px 0;"><strong>كلمة المرور:</strong> <span style="background: #fff; padding: 2px 8px; border-radius: 4px; font-family: monospace; border: 1px solid #ddd;">${password}</span></p>
          </div>

          <p>نصيحة: يرجى تغيير كلمة المرور بعد تسجيل الدخول لأول مرة.</p>
          
          <p>إذا احتجت لأي مساعدة، نحن هنا لخدمتك.</p>
          <p>مع تحيات فريق SchoolSaaS</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to ${toEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }
}

module.exports = new EmailService();