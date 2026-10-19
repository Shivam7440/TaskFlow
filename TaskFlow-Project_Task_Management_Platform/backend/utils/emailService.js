/**
 * Enterprise Email Service - TaskFlow
 * Premium HTML email templates with modern design.
 */

const nodemailer = require('nodemailer');

let transporter;

// Brand colors
const BRAND = {
  primary: '#6366F1',    // Indigo
  primaryDark: '#4F46E5',
  accent: '#3B82F6',     // Blue
  dark: '#0F172A',       // Slate 900
  text: '#334155',       // Slate 700
  muted: '#94A3B8',      // Slate 400
  light: '#F8FAFC',      // Slate 50
  border: '#E2E8F0',     // Slate 200
  success: '#10B981',
  warning: '#F59E0B',
};

// Shared email wrapper
const emailWrapper = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaskFlow</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
          
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background: linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent}); width: 44px; height: 44px; border-radius: 12px; text-align: center; vertical-align: middle;">
                    <span style="color: white; font-size: 22px; font-weight: 700; line-height: 44px;">✦</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 24px; font-weight: 800; color: ${BRAND.dark}; letter-spacing: -0.5px;">TaskFlow</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 24px rgba(0,0,0,0.04);">
                ${content}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px; color: ${BRAND.muted};">
                © ${new Date().getFullYear()} TaskFlow. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: #CBD5E1;">
                Task Management & Collaboration Platform
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Initialize Transporter
const createTransporter = async () => {
  if (process.env.EMAIL_SERVICE === 'production' && process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('📧 [EMAIL SERVICE] Configured for Production SMTP');
  } else {
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('📧 [EMAIL SERVICE] Configured with Ethereal Mock SMTP');
      console.log(`📧 [EMAIL SERVICE] Preview: https://ethereal.email/login`);
      console.log(`📧 [EMAIL SERVICE] User: ${testAccount.user}`);
    } catch (err) {
      console.error('Failed to create Ethereal test account', err);
    }
  }
};

createTransporter();

/**
 * Send an email
 */
const sendEmail = async (options) => {
  if (!transporter) await createTransporter();

  const message = {
    from: `"${process.env.EMAIL_FROM_NAME || 'TaskFlow Support'}" <${process.env.EMAIL_FROM || 'noreply@taskflow.com'}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(message);
    console.log(`📧 [EMAIL SENT] Message ID: ${info.messageId}`);
    if (nodemailer.getTestMessageUrl(info)) {
      console.log('📧 [EMAIL PREVIEW]', nodemailer.getTestMessageUrl(info));
    }
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('📧 [EMAIL ERROR]', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send email verification email
 */
const sendVerificationEmail = async ({ email, name, verificationToken }) => {
  const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;

  const content = `
    <!-- Gradient Banner -->
    <tr>
      <td style="background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.accent} 100%); padding: 48px 40px; text-align: center;">
        <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 20px; line-height: 64px;">
          <span style="font-size: 30px;">✉️</span>
        </div>
        <h1 style="margin: 0; color: #FFFFFF; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Verify Your Email</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 15px;">Just one step to get started</p>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding: 40px;">
        <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.dark}; font-weight: 600;">Hi ${name} 👋</p>
        <p style="margin: 0 0 24px; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
          Welcome to <strong style="color: ${BRAND.primary};">TaskFlow</strong>! We're thrilled to have you. Please verify your email address to unlock all features and start collaborating with your team.
        </p>
        
        <!-- CTA Button -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="padding: 8px 0 32px;">
              <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent}); color: #FFFFFF; padding: 14px 40px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                Verify Email Address →
              </a>
            </td>
          </tr>
        </table>

        <!-- Divider -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="border-top: 1px solid ${BRAND.border}; padding-top: 24px;"></td></tr>
        </table>

        <p style="margin: 0 0 8px; font-size: 12px; color: ${BRAND.muted}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Or copy this link</p>
        <p style="margin: 0; font-size: 12px; color: ${BRAND.accent}; word-break: break-all; line-height: 1.5; background: ${BRAND.light}; padding: 12px 16px; border-radius: 8px; border: 1px solid ${BRAND.border};">
          ${verificationUrl}
        </p>

        <p style="margin: 24px 0 0; font-size: 13px; color: ${BRAND.muted}; text-align: center;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </td>
    </tr>
  `;

  return sendEmail({
    to: email,
    subject: '✉️ Verify Your Email - TaskFlow',
    html: emailWrapper(content),
    text: `Welcome to TaskFlow! Please verify your email by visiting: ${verificationUrl}`,
  });
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async ({ email, name, resetToken }) => {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  const content = `
    <!-- Gradient Banner -->
    <tr>
      <td style="background: linear-gradient(135deg, ${BRAND.dark} 0%, #1E293B 100%); padding: 48px 40px; text-align: center;">
        <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.1); border-radius: 50%; margin: 0 auto 20px; line-height: 64px;">
          <span style="font-size: 30px;">🔐</span>
        </div>
        <h1 style="margin: 0; color: #FFFFFF; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Reset Your Password</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.6); font-size: 15px;">Secure your account</p>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding: 40px;">
        <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.dark}; font-weight: 600;">Hi ${name},</p>
        <p style="margin: 0 0 24px; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
          We received a request to reset your password for your <strong style="color: ${BRAND.primary};">TaskFlow</strong> account. Click the button below to set a new password.
        </p>
        
        <!-- CTA Button -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="padding: 8px 0 32px;">
              <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent}); color: #FFFFFF; padding: 14px 40px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                Reset Password →
              </a>
            </td>
          </tr>
        </table>

        <!-- Info Box -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background: #FEF3C7; padding: 14px 20px; border-radius: 10px; border-left: 4px solid ${BRAND.warning};">
              <p style="margin: 0; font-size: 13px; color: #92400E; font-weight: 500;">
                ⏱️ This link will expire in <strong>1 hour</strong> for security reasons.
              </p>
            </td>
          </tr>
        </table>

        <!-- Divider -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="border-top: 1px solid ${BRAND.border}; padding-top: 24px; margin-top: 24px;"></td></tr>
        </table>

        <p style="margin: 24px 0 8px; font-size: 12px; color: ${BRAND.muted}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Or copy this link</p>
        <p style="margin: 0; font-size: 12px; color: ${BRAND.accent}; word-break: break-all; line-height: 1.5; background: ${BRAND.light}; padding: 12px 16px; border-radius: 8px; border: 1px solid ${BRAND.border};">
          ${resetUrl}
        </p>

        <p style="margin: 24px 0 0; font-size: 13px; color: ${BRAND.muted}; text-align: center;">
          If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
        </p>
      </td>
    </tr>
  `;

  return sendEmail({
    to: email,
    subject: '🔐 Reset Your Password - TaskFlow',
    html: emailWrapper(content),
    text: `Reset your password by visiting: ${resetUrl}`,
  });
};

/**
 * Send task assignment notification
 */
const sendTaskAssignmentEmail = async ({ email, name, taskTitle, projectName, taskId }) => {
  const taskUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/tasks/${taskId}`;

  const content = `
    <!-- Gradient Banner -->
    <tr>
      <td style="background: linear-gradient(135deg, ${BRAND.primary} 0%, #8B5CF6 100%); padding: 48px 40px; text-align: center;">
        <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 20px; line-height: 64px;">
          <span style="font-size: 30px;">📋</span>
        </div>
        <h1 style="margin: 0; color: #FFFFFF; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">New Task Assigned</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 15px;">You've got a new task to work on</p>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding: 40px;">
        <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.dark}; font-weight: 600;">Hi ${name} 👋</p>
        <p style="margin: 0 0 24px; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
          You've been assigned a new task in <strong style="color: ${BRAND.primary};">${projectName}</strong>:
        </p>

        <!-- Task Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND.light}, #EEF2FF); padding: 20px 24px; border-radius: 12px; border: 1px solid ${BRAND.border};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 36px; vertical-align: top;">
                    <div style="width: 32px; height: 32px; background: ${BRAND.primary}; border-radius: 8px; text-align: center; line-height: 32px;">
                      <span style="color: white; font-size: 14px; font-weight: 700;">✓</span>
                    </div>
                  </td>
                  <td style="padding-left: 12px;">
                    <p style="margin: 0; font-size: 17px; font-weight: 700; color: ${BRAND.dark};">${taskTitle}</p>
                    <p style="margin: 4px 0 0; font-size: 13px; color: ${BRAND.muted};">Project: ${projectName}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <!-- CTA Button -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="padding: 32px 0 8px;">
              <a href="${taskUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent}); color: #FFFFFF; padding: 14px 40px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                View Task →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  return sendEmail({
    to: email,
    subject: `📋 New Task: ${taskTitle} - TaskFlow`,
    html: emailWrapper(content),
    text: `You have been assigned to task "${taskTitle}" in project "${projectName}". View it at: ${taskUrl}`,
  });
};

/**
 * Send project invitation email
 */
const sendProjectInviteEmail = async ({ email, name, projectName, inviterName, role, projectId }) => {
  const projectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/projects/${projectId}`;

  const content = `
    <!-- Gradient Banner -->
    <tr>
      <td style="background: linear-gradient(135deg, ${BRAND.success} 0%, #059669 100%); padding: 48px 40px; text-align: center;">
        <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 20px; line-height: 64px;">
          <span style="font-size: 30px;">🤝</span>
        </div>
        <h1 style="margin: 0; color: #FFFFFF; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">You're Invited!</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 15px;">Join a project on TaskFlow</p>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding: 40px;">
        <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.dark}; font-weight: 600;">Hi ${name} 👋</p>
        <p style="margin: 0 0 24px; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
          <strong>${inviterName}</strong> has invited you to collaborate on <strong style="color: ${BRAND.primary};">${projectName}</strong> as an <strong>${role}</strong>.
        </p>

        <!-- Invite Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background: ${BRAND.light}; padding: 20px 24px; border-radius: 12px; border: 1px solid ${BRAND.border};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 4px; font-size: 12px; color: ${BRAND.muted}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Project</p>
                    <p style="margin: 0 0 12px; font-size: 17px; font-weight: 700; color: ${BRAND.dark};">${projectName}</p>
                    <p style="margin: 0 0 4px; font-size: 12px; color: ${BRAND.muted}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Your Role</p>
                    <p style="margin: 0; font-size: 15px; font-weight: 600; color: ${BRAND.primary}; text-transform: capitalize;">${role}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <!-- CTA Button -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="padding: 32px 0 8px;">
              <a href="${projectUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND.success}, #059669); color: #FFFFFF; padding: 14px 40px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                View Invitation →
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 24px 0 0; font-size: 13px; color: ${BRAND.muted}; text-align: center;">
          You can accept or decline this invitation from your notifications.
        </p>
      </td>
    </tr>
  `;

  return sendEmail({
    to: email,
    subject: `🤝 ${inviterName} invited you to "${projectName}" - TaskFlow`,
    html: emailWrapper(content),
    text: `${inviterName} invited you to collaborate on "${projectName}" as ${role}. View it at: ${projectUrl}`,
  });
};

/**
 * Send welcome email on signup
 */
const sendWelcomeEmail = async ({ email, name }) => {
  const dashboardUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard`;

  const content = `
    <!-- Gradient Banner -->
    <tr>
      <td style="background: linear-gradient(135deg, ${BRAND.primary} 0%, #8B5CF6 50%, ${BRAND.accent} 100%); padding: 56px 40px; text-align: center;">
        <div style="width: 72px; height: 72px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 20px; line-height: 72px;">
          <span style="font-size: 36px;">🚀</span>
        </div>
        <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Welcome to TaskFlow!</h1>
        <p style="margin: 10px 0 0; color: rgba(255,255,255,0.85); font-size: 16px;">Your workspace is ready to go</p>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding: 40px;">
        <p style="margin: 0 0 16px; font-size: 18px; color: ${BRAND.dark}; font-weight: 700;">Hi ${name}! 🎉</p>
        <p style="margin: 0 0 28px; font-size: 15px; color: ${BRAND.text}; line-height: 1.7;">
          Thanks for joining <strong style="color: ${BRAND.primary};">TaskFlow</strong> — we're excited to have you! Your account is all set up and ready to help you manage tasks, collaborate with your team, and ship faster.
        </p>

        <!-- Feature Cards -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 8px;">
          <tr>
            <td style="background: linear-gradient(135deg, #EEF2FF, ${BRAND.light}); padding: 18px 20px; border-radius: 12px; border: 1px solid ${BRAND.border}; margin-bottom: 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 44px; vertical-align: top;">
                    <div style="width: 40px; height: 40px; background: ${BRAND.primary}; border-radius: 10px; text-align: center; line-height: 40px;">
                      <span style="font-size: 18px;">📁</span>
                    </div>
                  </td>
                  <td style="padding-left: 14px;">
                    <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${BRAND.dark};">Create Projects</p>
                    <p style="margin: 3px 0 0; font-size: 13px; color: ${BRAND.muted}; line-height: 1.4;">Organize work into projects with Kanban boards, custom columns, and labels.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 8px;">
          <tr>
            <td style="background: linear-gradient(135deg, #F0FDF4, ${BRAND.light}); padding: 18px 20px; border-radius: 12px; border: 1px solid ${BRAND.border};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 44px; vertical-align: top;">
                    <div style="width: 40px; height: 40px; background: ${BRAND.success}; border-radius: 10px; text-align: center; line-height: 40px;">
                      <span style="font-size: 18px;">👥</span>
                    </div>
                  </td>
                  <td style="padding-left: 14px;">
                    <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${BRAND.dark};">Collaborate in Real-time</p>
                    <p style="margin: 3px 0 0; font-size: 13px; color: ${BRAND.muted}; line-height: 1.4;">Invite your team, assign tasks, and chat — all changes sync instantly.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
          <tr>
            <td style="background: linear-gradient(135deg, #FEF3C7, ${BRAND.light}); padding: 18px 20px; border-radius: 12px; border: 1px solid ${BRAND.border};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 44px; vertical-align: top;">
                    <div style="width: 40px; height: 40px; background: ${BRAND.warning}; border-radius: 10px; text-align: center; line-height: 40px;">
                      <span style="font-size: 18px;">📊</span>
                    </div>
                  </td>
                  <td style="padding-left: 14px;">
                    <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${BRAND.dark};">Track Progress</p>
                    <p style="margin: 3px 0 0; font-size: 13px; color: ${BRAND.muted}; line-height: 1.4;">Get insights with analytics, calendar views, and progress tracking.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <!-- CTA Button -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="padding: 0 0 16px;">
              <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent}); color: #FFFFFF; padding: 16px 48px; font-size: 16px; font-weight: 700; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                Get Started →
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 16px 0 0; font-size: 13px; color: ${BRAND.muted}; text-align: center; line-height: 1.5;">
          Need help? Just reply to this email — we're always happy to assist.
        </p>
      </td>
    </tr>
  `;

  return sendEmail({
    to: email,
    subject: `🚀 Welcome to TaskFlow, ${name}!`,
    html: emailWrapper(content),
    text: `Welcome to TaskFlow, ${name}! Your account is ready. Get started at: ${dashboardUrl}`,
  });
};

const sendContactFormEmail = async ({ name, email, subject, message }) => {
  const content = `
    <!-- Gradient Banner -->
    <tr>
      <td style="background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.accent} 100%); padding: 48px 40px; text-align: center;">
        <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 20px; line-height: 64px;">
          <span style="font-size: 30px;">📬</span>
        </div>
        <h1 style="margin: 0; color: #FFFFFF; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">New Contact Inquiry</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 15px;">A potential client reached out</p>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding: 40px;">
        <p style="margin: 0 0 24px; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
          You have received a new message from the <strong>TaskFlow Landing Page</strong> contact form.
        </p>
        
        <!-- Inquiry Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background: ${BRAND.light}; padding: 24px; border-radius: 12px; border: 1px solid ${BRAND.border};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-bottom: 20px;">
                    <p style="margin: 0 0 4px; font-size: 12px; color: ${BRAND.muted}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Full Name</p>
                    <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${BRAND.dark};">${name}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 20px;">
                    <p style="margin: 0 0 4px; font-size: 12px; color: ${BRAND.muted}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Email Address</p>
                    <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${BRAND.primary};">${email}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 20px;">
                    <p style="margin: 0 0 4px; font-size: 12px; color: ${BRAND.muted}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Subject</p>
                    <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${BRAND.dark};">${subject}</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin: 0 0 4px; font-size: 12px; color: ${BRAND.muted}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Message</p>
                    <p style="margin: 0; font-size: 14px; color: ${BRAND.text}; line-height: 1.6; background: white; padding: 12px; border-radius: 8px; border: 1px solid #E2E8F0;">
                      ${message}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="margin: 24px 0 0; font-size: 13px; color: ${BRAND.muted}; text-align: center;">
          Reply directly to this email to contact <strong>${name}</strong>.
        </p>
      </td>
    </tr>
  `;

  return sendEmail({
    to: process.env.ADMIN_EMAIL || 'support@taskflow.app',
    subject: `📬 Contact Inquiry: ${subject} (${name})`,
    html: emailWrapper(content),
    text: `New contact form submission from ${name} (${email}). Subject: ${subject}. Message: ${message}`,
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendTaskAssignmentEmail,
  sendProjectInviteEmail,
  sendWelcomeEmail,
  sendContactFormEmail,
};