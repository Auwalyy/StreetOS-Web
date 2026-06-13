const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"StreetOS AI" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

const emailTemplates = {
  verification: (name, token) => ({
    subject: 'Verify Your StreetOS Account',
    html: `<div style="font-family:Arial;max-width:600px;margin:auto;padding:20px">
      <h2 style="color:#f97316">Welcome to StreetOS AI, ${name}!</h2>
      <p>Click the button below to verify your email address.</p>
      <a href="${process.env.CLIENT_URL}/verify-email/${token}" 
         style="background:#f97316;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
        Verify Email
      </a>
      <p style="color:#666;margin-top:20px">This link expires in 24 hours.</p>
    </div>`,
  }),
  resetPassword: (name, token) => ({
    subject: 'Reset Your StreetOS Password',
    html: `<div style="font-family:Arial;max-width:600px;margin:auto;padding:20px">
      <h2 style="color:#f97316">Password Reset - ${name}</h2>
      <p>Click the button below to reset your password.</p>
      <a href="${process.env.CLIENT_URL}/reset-password/${token}"
         style="background:#f97316;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
        Reset Password
      </a>
      <p style="color:#666;margin-top:20px">This link expires in 1 hour.</p>
    </div>`,
  }),
  debtReminder: (creditorName, debtorName, amount, dueDate) => ({
    subject: `Payment Reminder: ₦${amount} Due`,
    html: `<div style="font-family:Arial;max-width:600px;margin:auto;padding:20px">
      <h2 style="color:#f97316">Payment Reminder</h2>
      <p>Hi ${debtorName}, this is a reminder from ${creditorName}.</p>
      <p>You have an outstanding balance of <strong>₦${amount.toLocaleString()}</strong> due on ${new Date(dueDate).toLocaleDateString()}.</p>
      <p>Please make your payment to avoid any issues.</p>
    </div>`,
  }),
};

module.exports = { sendEmail, emailTemplates };
