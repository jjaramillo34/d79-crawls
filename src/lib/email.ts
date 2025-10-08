import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Initialize SendGrid if API key is provided
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Create transporter for sending emails via SMTP
export const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Send email function - supports both SendGrid and SMTP
export const sendEmail = async ({ to, subject, html }: EmailOptions) => {
  try {
    // Use SendGrid if configured
    if (process.env.EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
      const msg = {
        to,
        from: {
          email: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@schools.nyc.gov',
          name: 'District 79 Fall Crawls'
        },
        subject,
        html,
      };

      const [response] = await sgMail.send(msg);
      return { success: true, messageId: response.headers['x-message-id'] };
    }
    // Otherwise use SMTP (nodemailer)
    else {
      const transporter = createTransporter();

      const mailOptions = {
        from: {
          name: 'District 79 Fall Crawls',
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@schools.nyc.gov'
        },
        to,
        subject,
        html,
      };

      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
};

// Template for registration confirmation email
export const getRegistrationConfirmationEmail = (data: {
  firstName: string;
  lastName: string;
  crawlDate: string;
  description: string;
  // instead the location string, use the location name
  crawlLocationName: string;
  crawlLocationAddress?: string;
  time: string;
}) => {
  const dateDisplay = data.crawlDate === 'tuesday' ? 'Tuesday, October 28, 2024' : 'Thursday, October 30, 2024';
  const locationDisplay = data.crawlLocationName;
  const descriptionDisplay = data.description;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #ECC67F;
          color: white;
          padding: 30px 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content {
          background-color: #ffffff;
          padding: 30px;
          border: 2px solid #ECC67F;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }
        .info-box {
          background-color: #FFF8E7;
          border-left: 4px solid #ECC67F;
          padding: 15px;
          margin: 20px 0;
        }
        .info-box p {
          margin: 8px 0;
        }
        .info-box strong {
          color: #B8935E;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          color: #666;
          font-size: 14px;
        }
        .button {
          display: inline-block;
          background-color: #ECC67F;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 Registration Confirmed!</h1>
      </div>
      <div class="content">
        <p>Dear ${data.firstName} ${data.lastName},</p>
        
        <p>Thank you for registering for the <strong>District 79 Fall Crawls</strong>! We're excited to have you join us.</p>
        
        <div class="info-box">
          <h3 style="margin-top: 0; color: #B8935E;">Your Registration Details:</h3>
          <p><strong>Date:</strong> ${dateDisplay}</p>
          <p><strong>Time:</strong> ${data.time}</p>
          ${data.description ? `<p><strong>Details:</strong> ${descriptionDisplay}</p>` : ''}
          <p><strong>Location:</strong> ${locationDisplay}</p>
        </div>
        
        <h3>What to Expect:</h3>
        <ul>
          <li>Information session about District 79 programs</li>
          <li>Site visit to a Referral Center and D79 site</li>
          <li>Opportunity to meet staff and make connections</li>
          <li>Learn about opportunities for your families and students</li>
        </ul>
        
        <h3>Important Reminders:</h3>
        <ul>
          <li>Please arrive 10 minutes early</li>
          <li>Bring a valid NYCPS ID</li>
          <li>Dress comfortably for the site visit</li>
        </ul>
        
        <p>If you need to cancel or have any questions, please contact us at <a href="mailto:jjaramillo7@schools.nyc.gov">jjaramillo7@schools.nyc.gov</a> or <a href="mailto:soliger@schools.nyc.gov">soliger@schools.nyc.gov</a>.        
        </p>
        
        <p>We look forward to seeing you!</p>
        
        <p><strong>District 79 Team</strong><br>
        Alternative Schools & Programs</p>
      </div>
      
      <div class="footer">
        <p>District 79 - NYC Public Schools</p>
        <p>This is an automated confirmation email. Please do not reply directly to this message.</p>
      </div>
    </body>
    </html>
  `;
};

// Template for admin notification email
export const getAdminNotificationEmail = (data: {
  firstName: string;
  lastName: string;
  email: string;
  school: string;
  crawlDate: string;
  crawlLocation: string;
  crawlLocationName: string;
  description: string;
  crawlLocationAddress?: string;
  availableSpots: number;
}) => {
  const dateDisplay = data.crawlDate === 'tuesday' ? 'Tuesday, October 28, 2024' : 'Thursday, October 30, 2024';
  const locationDisplay = data.crawlLocation;
  const descriptionDisplay = data.description;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #ECC67F;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #ffffff;
          padding: 30px;
          border: 2px solid #ECC67F;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }
        .info-box {
          background-color: #FFF8E7;
          border: 1px solid #ECC67F;
          padding: 15px;
          margin: 20px 0;
          border-radius: 5px;
        }
        .info-row {
          display: flex;
          margin: 8px 0;
        }
        .info-label {
          font-weight: bold;
          color: #B8935E;
          width: 150px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>📝 New Registration - D79 Fall Crawls</h2>
      </div>
      <div class="content">
        <p>A new participant has registered for the D79 Fall Crawls:</p>
        
        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Name:</span>
            <span>${data.firstName} ${data.lastName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email:</span>
            <span>${data.email}</span>
          </div>
          <div class="info-row">
            <span class="info-label">School:</span>
            <span>${data.school}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Crawl Date:</span>
            <span>${dateDisplay}</span>
          </div>
          ${data.description ? `
            <div class="info-row">
              <span class="info-label">Details:</span>
              <span>${descriptionDisplay}</span>
            </div>
            ` : ''}
          <div class="info-row">
            <span class="info-label">Location:</span>
            <span>${locationDisplay}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Spots Remaining:</span>
            <span style="color: ${data.availableSpots <= 5 ? '#d9534f' : '#5cb85c'}; font-weight: bold;">
              ${data.availableSpots} / 20
            </span>
          </div>
        </div>
        
        ${data.availableSpots <= 5 ? `
          <p style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px;">
            <strong>⚠️ Alert:</strong> Only ${data.availableSpots} spots remaining for this crawl!
          </p>
        ` : ''}
        
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          Registration timestamp: ${new Date().toLocaleString()}
        </p>
      </div>
    </body>
    </html>
  `;
};
