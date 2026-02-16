import nodemailer from 'nodemailer';

// Create a test account for development if no email credentials are provided
const createTransporter = async () => {
  // For production, use real credentials
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use app password for Gmail
      },
    });
  }
  
  // For development, use Ethereal test account
  console.log('No email credentials found, creating test account...');
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log('Test account created:', testAccount.user);
    
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } catch (error) {
    console.error('Failed to create test email account:', error);
    throw error;
  }
};

// Initialize transporter as null, will be created when needed
let transporter = null;

/**
 * Send an email using the configured transporter
 * @param {Object} params
 * @param {string} params.to
 * @param {string} params.subject
 * @param {string} [params.html]
 * @param {string} [params.text]
 * @param {Array} [params.attachments] - Array of attachment objects { filename, content, contentType }
 */
export async function sendMail(params) {
  const { to, subject, html, text, attachments } = params || {};
  
  // Create transporter if it doesn't exist
  if (!transporter) {
    transporter = await createTransporter();
  }
  
  const from = process.env.MAIL_FROM || process.env.EMAIL_USER || 'noreply@signatureday.com';
  const mailOptions = { from, to, subject, html, text };
  
  // Add attachments if provided
  if (attachments && Array.isArray(attachments) && attachments.length > 0) {
    mailOptions.attachments = attachments;
  }
  
  const info = await transporter.sendMail(mailOptions);
  
  // Log preview URL for development
  if (info.messageId && !process.env.EMAIL_USER) {
    console.log('Email sent:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
  }
  
  return info;
}
