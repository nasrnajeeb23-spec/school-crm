const { Notification } = require('../models');

class NotificationService {
  /**
   * Send an internal notification to a user (Parent, Teacher, etc.)
   * @param {Object} data
   * @param {string} data.title - Notification title
   * @param {string} data.description - Notification body
   * @param {string} data.type - 'Financial', 'Academic', 'Info', 'Warning'
   * @param {number} [data.parentId] - ID of the parent to notify
   * @param {number} [data.teacherId] - ID of the teacher to notify
   * @param {number} [data.schoolId] - School ID context
   */
  async send(data) {
    try {
      const { title, description, type, parentId, teacherId, schoolId } = data;

      const notification = await Notification.create({
        title,
        description,
        type: type || 'Info',
        status: 'Sent',
        date: new Date(),
        isRead: false,
        parentId: parentId || null,
        teacherId: teacherId || null,
        schoolId: schoolId || null, // Assuming you might want to scope by school later
      });

      console.log(`Internal Notification sent: ${title} (ID: ${notification.id})`);
      return notification;
    } catch (error) {
      console.error('Error sending internal notification:', error);
      return null;
    }
  }

  // Helper specifically for financial alerts
  async sendFinancialAlert(parentId, title, message, schoolId) {
    return this.send({
      title,
      description: message,
      type: 'Financial',
      parentId,
      schoolId
    });
  }
}

module.exports = new NotificationService();