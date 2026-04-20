const nodemailer = require('nodemailer');

// Create transporter - works with Gmail, Outlook, or any SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  }
});

const FROM = process.env.EMAIL_FROM || 'JobSphere <noreply@jobsphere.com>';

// Send email to recruiter when someone applies
async function sendApplicationNotification({ recruiterEmail, recruiterName, applicantName, applicantEmail, jobTitle, jobId, resumeUrl }) {
  if (!process.env.EMAIL_USER) return; // skip if email not configured
  try {
    await transporter.sendMail({
      from: FROM,
      to: recruiterEmail,
      subject: `New Application: ${jobTitle}`,
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e1dd;">
          <div style="background:#0d0d14;padding:28px 32px;">
            <h1 style="color:#fff;font-size:22px;margin:0;">Job<span style="color:#e85d26;">Sphere</span></h1>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#0d0d14;margin-top:0;">New Application Received 🎉</h2>
            <p style="color:#555;">Hi <strong>${recruiterName}</strong>,</p>
            <p style="color:#555;">Someone has applied to your job posting <strong>"${jobTitle}"</strong>.</p>
            <div style="background:#f7f6f3;border-radius:10px;padding:20px;margin:20px 0;">
              <p style="margin:0 0 8px;color:#0d0d14;"><strong>Applicant:</strong> ${applicantName}</p>
              <p style="margin:0 0 8px;color:#0d0d14;"><strong>Email:</strong> ${applicantEmail}</p>
              ${resumeUrl ? `<p style="margin:0;color:#0d0d14;"><strong>Resume:</strong> <a href="${resumeUrl}" style="color:#e85d26;">View Resume</a></p>` : ''}
            </div>
            <a href="${process.env.SITE_URL || 'http://localhost:3000'}/jobs/${jobId}"
              style="display:inline-block;background:#e85d26;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:8px;">
              View Application
            </a>
          </div>
          <div style="padding:20px 32px;background:#f7f6f3;color:#888;font-size:12px;">
            JobSphere · Connecting talent with opportunity
          </div>
        </div>
      `
    });
  } catch (e) {
    console.error('Email error (non-fatal):', e.message);
  }
}

// Send confirmation to applicant
async function sendApplicationConfirmation({ applicantEmail, applicantName, jobTitle, companyName }) {
  if (!process.env.EMAIL_USER) return;
  try {
    await transporter.sendMail({
      from: FROM,
      to: applicantEmail,
      subject: `Application Submitted: ${jobTitle} at ${companyName}`,
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e1dd;">
          <div style="background:#0d0d14;padding:28px 32px;">
            <h1 style="color:#fff;font-size:22px;margin:0;">Job<span style="color:#e85d26;">Sphere</span></h1>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#0d0d14;margin-top:0;">Application Submitted! ✅</h2>
            <p style="color:#555;">Hi <strong>${applicantName}</strong>,</p>
            <p style="color:#555;">Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been successfully submitted.</p>
            <p style="color:#555;">The recruiter will review your application and get back to you. You can track your application status in your dashboard.</p>
            <a href="${process.env.SITE_URL || 'http://localhost:3000'}/users/dashboard"
              style="display:inline-block;background:#e85d26;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:8px;">
              View Dashboard
            </a>
          </div>
          <div style="padding:20px 32px;background:#f7f6f3;color:#888;font-size:12px;">
            JobSphere · Connecting talent with opportunity
          </div>
        </div>
      `
    });
  } catch (e) {
    console.error('Email error (non-fatal):', e.message);
  }
}

// Send status update to applicant
async function sendStatusUpdate({ applicantEmail, applicantName, jobTitle, companyName, status }) {
  if (!process.env.EMAIL_USER) return;
  const statusMsg = {
    reviewed: 'Your application has been reviewed by the recruiter.',
    shortlisted: '🎉 Great news! You have been shortlisted for this position.',
    rejected: 'Unfortunately, you were not selected for this position. Keep applying!'
  }[status] || `Your application status has been updated to: ${status}`;

  try {
    await transporter.sendMail({
      from: FROM,
      to: applicantEmail,
      subject: `Application Update: ${jobTitle} at ${companyName}`,
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e1dd;">
          <div style="background:#0d0d14;padding:28px 32px;">
            <h1 style="color:#fff;font-size:22px;margin:0;">Job<span style="color:#e85d26;">Sphere</span></h1>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#0d0d14;margin-top:0;">Application Status Update</h2>
            <p style="color:#555;">Hi <strong>${applicantName}</strong>,</p>
            <p style="color:#555;">Regarding your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong>:</p>
            <p style="color:#555;">${statusMsg}</p>
            <a href="${process.env.SITE_URL || 'http://localhost:3000'}/users/dashboard"
              style="display:inline-block;background:#e85d26;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:8px;">
              View Dashboard
            </a>
          </div>
          <div style="padding:20px 32px;background:#f7f6f3;color:#888;font-size:12px;">
            JobSphere · Connecting talent with opportunity
          </div>
        </div>
      `
    });
  } catch (e) {
    console.error('Email error (non-fatal):', e.message);
  }
}

module.exports = { sendApplicationNotification, sendApplicationConfirmation, sendStatusUpdate };
