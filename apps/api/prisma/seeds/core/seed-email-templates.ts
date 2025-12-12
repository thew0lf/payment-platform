// Email Templates Seed - Default system templates for authentication and notifications
import { PrismaClient, EmailTemplateCategory } from '@prisma/client';

const prisma = new PrismaClient();

const PASSWORD_RESET_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>Oops! Let's fix that password</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    /* Reset */
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }

    /* Base */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f0f4f8;
      width: 100% !important;
      min-width: 100%;
    }

    /* Container */
    .wrapper { width: 100%; table-layout: fixed; background-color: #f0f4f8; padding: 20px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #f0f4f8; }

    /* Card */
    .card {
      background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      margin: 10px 16px;
      overflow: hidden;
    }
    .card-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .card-body { padding: 32px 24px; }

    /* Logo */
    .logo-container {
      display: inline-block;
      margin-bottom: 20px;
    }
    .logo-icon {
      display: inline-block;
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%);
      border-radius: 12px;
      vertical-align: middle;
      text-align: center;
      line-height: 48px;
      margin-right: 12px;
    }
    .logo-icon-letter {
      color: #ffffff;
      font-size: 28px;
      font-weight: 800;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .logo-text {
      display: inline-block;
      font-size: 28px;
      font-weight: 800;
      color: #ffffff !important;
      text-decoration: none !important;
      border-bottom: none !important;
      vertical-align: middle;
      letter-spacing: -0.5px;
      font-family: system-ui, -apple-system, sans-serif;
    }

    /* Typography */
    h1 {
      color: #ffffff;
      font-size: 22px;
      font-weight: 600;
      margin: 16px 0 0 0;
      line-height: 1.3;
    }
    .greeting {
      font-size: 18px;
      color: #1a1a2e;
      margin: 0 0 16px 0;
      font-weight: 600;
    }
    p { color: #4a5568; margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; }
    .fun-text {
      color: #667eea;
      font-weight: 500;
    }

    /* Button */
    .button-container { text-align: center; padding: 8px 0 24px 0; }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 50px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
    }

    /* Link fallback */
    .link-text {
      color: #718096;
      font-size: 12px;
      word-break: break-all;
      background: #f7fafc;
      padding: 12px 16px;
      border-radius: 8px;
      margin: 16px 0;
      border: 1px dashed #e2e8f0;
    }

    /* Fun fact box */
    .fun-box {
      background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
      border-radius: 12px;
      padding: 16px 20px;
      margin: 20px 0;
    }
    .fun-box p {
      color: #744210;
      margin: 0;
      font-size: 14px;
    }
    .fun-box strong {
      color: #7b341e;
    }

    /* Security notice */
    .security-notice {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      border-radius: 0 8px 8px 0;
      padding: 16px 20px;
      margin: 24px 0 0 0;
    }
    .security-notice p {
      color: #92400e;
      margin: 0;
      font-size: 13px;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 24px 16px;
    }
    .footer p {
      color: #a0aec0;
      font-size: 12px;
      margin: 4px 0;
    }
    .footer a { color: #667eea; text-decoration: none; }

    /* Mobile responsive */
    @media only screen and (max-width: 480px) {
      .card { margin: 10px 12px; }
      .card-header { padding: 24px 20px; }
      .card-body { padding: 24px 20px; }
      .logo-icon { width: 40px; height: 40px; line-height: 40px; border-radius: 10px; margin-right: 10px; }
      .logo-icon-letter { font-size: 24px; }
      .logo-text { font-size: 24px; }
      h1 { font-size: 20px; }
      .button { padding: 14px 32px; font-size: 15px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="card">
        <div class="card-header">
          <div class="logo-container">
            <div class="logo-icon"><span class="logo-icon-letter">A</span></div><!--
            --><span class="logo-text" style="color:#ffffff !important;text-decoration:none !important;border:none !important;">avnz<span style="font-size:0;">&#8203;</span>.io</span>
          </div>
          <h1>Forgot your password?<br>No worries, we've got you!</h1>
        </div>
        <div class="card-body">
          <p class="greeting">Hey {{userName}}! 👋</p>
          <p>Looks like your password decided to go on vacation without telling you. Rude, right? 🏖️</p>
          <p>But hey, we're here to help you get back in action! Just click the magic button below and you'll be back to crushing it in no time.</p>

          <div class="button-container">
            <a href="{{resetUrl}}" class="button">Reset My Password ✨</a>
          </div>

          <p class="link-text">
            <strong>Can't click the button?</strong> Copy this link:<br>{{resetUrl}}
          </p>

          <div class="fun-box">
            <p><strong>💡 Pro tip:</strong> Make your new password memorable but secure! Maybe try combining your favorite coffee order with a random number? ☕ + 🔢 = 🔒</p>
          </div>

          <div class="security-notice">
            <p><strong>🛡️ Security heads up:</strong> This link will self-destruct in {{expiresIn}} (very Mission Impossible, we know). If you didn't request this reset, just ignore this email—your account is still safe!</p>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Need help? We're always here at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
        <p>© {{currentYear}} AVNZ Platform • SOC2 & ISO 27001 Compliant</p>
        <p style="margin-top: 12px; color: #cbd5e0;">Made with 💜 by the AVNZ team</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

const PASSWORD_RESET_TEXT = `
Hey {{userName}}! 👋

Forgot your password? No worries, we've got you!

Looks like your password decided to go on vacation without telling you. Rude, right?

But hey, we're here to help you get back in action! Just click the link below:

{{resetUrl}}

💡 Pro tip: Make your new password memorable but secure!

🛡️ Security heads up: This link will self-destruct in {{expiresIn}} (very Mission Impossible, we know). If you didn't request this reset, just ignore this email—your account is still safe!

Need help? We're always here at {{supportEmail}}

---
© {{currentYear}} AVNZ Platform • SOC2 & ISO 27001 Compliant
Made with 💜 by the AVNZ team
`;

const WELCOME_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to AVNZ Platform</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 40px; margin: 20px 0; }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo-text { font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #00d4ff, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    h1 { color: #1a1a1a; font-size: 24px; margin-bottom: 20px; text-align: center; }
    p { color: #666; margin-bottom: 20px; }
    .button { display: inline-block; background: linear-gradient(135deg, #00d4ff, #3b82f6); color: #fff !important; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: 600; text-align: center; margin: 20px 0; }
    .button:hover { opacity: 0.9; }
    .button-container { text-align: center; }
    .features { background: #f8fafc; border-radius: 6px; padding: 20px; margin: 20px 0; }
    .features h3 { color: #1a1a1a; margin-top: 0; }
    .features ul { color: #666; margin: 0; padding-left: 20px; }
    .features li { margin-bottom: 8px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <span class="logo-text">avnz.io</span>
      </div>
      <h1>Welcome to {{companyName}}!</h1>
      <p>Hi {{userName}},</p>
      <p>Your account has been created and you're ready to get started. We're excited to have you on board!</p>
      <div class="button-container">
        <a href="{{loginUrl}}" class="button">Go to Dashboard</a>
      </div>
      <div class="features">
        <h3>What you can do:</h3>
        <ul>
          <li>Process payments securely with intelligent routing</li>
          <li>Monitor transactions in real-time</li>
          <li>Access detailed analytics and reporting</li>
          <li>Manage customers and orders efficiently</li>
        </ul>
      </div>
      <p>If you have any questions, our support team is here to help at {{supportEmail}}.</p>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} AVNZ Platform. All rights reserved.</p>
      <p>SOC2 & ISO 27001 Compliant</p>
    </div>
  </div>
</body>
</html>
`;

const WELCOME_TEXT = `
Welcome to {{companyName}}!

Hi {{userName}},

Your account has been created and you're ready to get started. We're excited to have you on board!

Go to your dashboard: {{loginUrl}}

What you can do:
- Process payments securely with intelligent routing
- Monitor transactions in real-time
- Access detailed analytics and reporting
- Manage customers and orders efficiently

If you have any questions, our support team is here to help at {{supportEmail}}.

---
© {{currentYear}} AVNZ Platform. All rights reserved.
SOC2 & ISO 27001 Compliant
`;

const EMAIL_VERIFICATION_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 40px; margin: 20px 0; }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo-text { font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #00d4ff, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    h1 { color: #1a1a1a; font-size: 24px; margin-bottom: 20px; text-align: center; }
    p { color: #666; margin-bottom: 20px; }
    .button { display: inline-block; background: linear-gradient(135deg, #00d4ff, #3b82f6); color: #fff !important; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: 600; text-align: center; margin: 20px 0; }
    .button:hover { opacity: 0.9; }
    .button-container { text-align: center; }
    .link-text { color: #666; font-size: 12px; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; margin-top: 20px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <span class="logo-text">avnz.io</span>
      </div>
      <h1>Verify Your Email Address</h1>
      <p>Hi {{userName}},</p>
      <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
      <div class="button-container">
        <a href="{{verifyUrl}}" class="button">Verify Email</a>
      </div>
      <p class="link-text">Or copy and paste this link into your browser:<br>{{verifyUrl}}</p>
      <p>This verification link will expire in {{expiresIn}}.</p>
      <p>If you didn't create an account with us, please ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} AVNZ Platform. All rights reserved.</p>
      <p>SOC2 & ISO 27001 Compliant</p>
    </div>
  </div>
</body>
</html>
`;

const EMAIL_VERIFICATION_TEXT = `
Verify Your Email Address

Hi {{userName}},

Thanks for signing up! Please verify your email address by visiting the link below:

{{verifyUrl}}

This verification link will expire in {{expiresIn}}.

If you didn't create an account with us, please ignore this email.

---
© {{currentYear}} AVNZ Platform. All rights reserved.
SOC2 & ISO 27001 Compliant
`;

export async function seedEmailTemplates() {
  console.log('🔄 Seeding email templates...');

  const templates = [
    {
      code: 'password-reset',
      name: 'Password Reset',
      description: 'Email sent when user requests a password reset',
      category: EmailTemplateCategory.AUTHENTICATION,
      subject: 'Reset your password',
      htmlBody: PASSWORD_RESET_HTML.trim(),
      textBody: PASSWORD_RESET_TEXT.trim(),
      fromName: 'AVNZ Platform',
      fromEmail: 'noreply@avnz.io',
      replyTo: 'support@avnz.io',
      isSystem: true,
      isActive: true,
      variables: [
        { name: 'userName', type: 'string', required: true, description: 'User\'s name or email prefix' },
        { name: 'resetUrl', type: 'url', required: true, description: 'Password reset URL with token' },
        { name: 'expiresIn', type: 'string', required: true, description: 'Token expiration time (e.g., "1 hour")' },
        { name: 'supportEmail', type: 'string', required: true, description: 'Support email address' },
      ],
    },
    {
      code: 'welcome',
      name: 'Welcome Email',
      description: 'Email sent to new users after registration',
      category: EmailTemplateCategory.AUTHENTICATION,
      subject: 'Welcome to {{companyName}}!',
      htmlBody: WELCOME_HTML.trim(),
      textBody: WELCOME_TEXT.trim(),
      fromName: 'AVNZ Platform',
      fromEmail: 'noreply@avnz.io',
      replyTo: 'support@avnz.io',
      isSystem: true,
      isActive: true,
      variables: [
        { name: 'userName', type: 'string', required: true, description: 'User\'s name or email prefix' },
        { name: 'companyName', type: 'string', required: true, description: 'Company name' },
        { name: 'loginUrl', type: 'url', required: true, description: 'Dashboard login URL' },
        { name: 'supportEmail', type: 'string', required: true, description: 'Support email address' },
      ],
    },
    {
      code: 'email-verification',
      name: 'Email Verification',
      description: 'Email sent to verify user\'s email address',
      category: EmailTemplateCategory.AUTHENTICATION,
      subject: 'Verify your email address',
      htmlBody: EMAIL_VERIFICATION_HTML.trim(),
      textBody: EMAIL_VERIFICATION_TEXT.trim(),
      fromName: 'AVNZ Platform',
      fromEmail: 'noreply@avnz.io',
      replyTo: 'support@avnz.io',
      isSystem: true,
      isActive: true,
      variables: [
        { name: 'userName', type: 'string', required: true, description: 'User\'s name or email prefix' },
        { name: 'verifyUrl', type: 'url', required: true, description: 'Email verification URL with token' },
        { name: 'expiresIn', type: 'string', required: true, description: 'Token expiration time (e.g., "24 hours")' },
      ],
    },
  ];

  for (const template of templates) {
    // Check if template already exists (system templates have no scope)
    const existing = await prisma.emailTemplate.findFirst({
      where: {
        code: template.code,
        isSystem: true,
        organizationId: null,
        clientId: null,
        companyId: null,
      },
    });

    if (existing) {
      console.log(`  ↳ Template "${template.code}" already exists, updating...`);
      await prisma.emailTemplate.update({
        where: { id: existing.id },
        data: {
          name: template.name,
          description: template.description,
          category: template.category,
          subject: template.subject,
          htmlBody: template.htmlBody,
          textBody: template.textBody,
          fromName: template.fromName,
          fromEmail: template.fromEmail,
          replyTo: template.replyTo,
          variables: template.variables,
          version: { increment: 1 },
        },
      });
    } else {
      console.log(`  ↳ Creating template "${template.code}"...`);
      await prisma.emailTemplate.create({
        data: template,
      });
    }
  }

  console.log('✅ Email templates seeded successfully');
}

// Run if called directly
if (require.main === module) {
  seedEmailTemplates()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
