const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendNotificationEmail(userEmail, notification) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: notification.title,
        html: this.generateEmailTemplate(notification)
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  generateEmailTemplate(notification) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4285f4; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .btn { display: inline-block; padding: 10px 20px; background: #4285f4; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Classroom Notification</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            ${notification.actionUrl ? `<a href="${process.env.FRONTEND_URL}${notification.actionUrl}" class="btn">View Details</a>` : ''}
          </div>
          <div class="footer">
            <p>You received this email because you're enrolled in our classroom system.</p>
            <p><a href="${process.env.FRONTEND_URL}/notification-settings">Manage notifications</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendBulkEmails(emails, subject, message) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        bcc: emails,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #4285f4; color: white; padding: 20px; text-align: center;">
              <h1>Classroom Announcement</h1>
            </div>
            <div style="padding: 20px; background: #f9f9f9;">
              <h2>${subject}</h2>
              <p>${message.replace(/\n/g, '<br>')}</p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
              <p>This email was sent to your class.</p>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Bulk email sending failed:', error);
      return false;
    }
  }

  // Optional: Add a method to verify the transporter configuration
  async verifyTransporter() {
    try {
      await this.transporter.verify();
      console.log('Email transporter is ready');
      return true;
    } catch (error) {
      console.error('Email transporter verification failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();