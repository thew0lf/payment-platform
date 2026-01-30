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
      background-color: #667eea; /* Fallback solid color */
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
      background-color: #6366f1; /* Fallback solid color */
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
      text-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 0 10px rgba(99,102,241,0.5);
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
      text-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 0 10px rgba(99,102,241,0.5);
    }
    /* Gmail auto-link prevention: separate spans for avnz, dot, io */
    .logo-text-part {
      color: #ffffff !important;
      text-decoration: none !important;
      border: none !important;
      text-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 0 10px rgba(99,102,241,0.5);
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
      color: #64748b;
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
        <div class="card-header" style="background-color:#667eea;">
          <div class="logo-container">
            <div class="logo-icon" style="background-color:#6366f1;"><span class="logo-icon-letter" style="text-shadow:0 1px 2px rgba(0,0,0,0.3);">A</span></div><!--
            --><span class="logo-text" style="text-shadow:0 1px 2px rgba(0,0,0,0.3);"><span class="logo-text-part" style="color:#ffffff !important;text-decoration:none !important;text-shadow:0 1px 2px rgba(0,0,0,0.3);">avnz</span><span class="logo-text-part" style="color:#ffffff !important;text-decoration:none !important;text-shadow:0 1px 2px rgba(0,0,0,0.3);">.</span><span class="logo-text-part" style="color:#ffffff !important;text-decoration:none !important;text-shadow:0 1px 2px rgba(0,0,0,0.3);">io</span></span>
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
        <p style="margin-top: 12px; color: #64748b;">Made with 💜 by the AVNZ team</p>
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
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>Welcome to the party! 🎉</title>
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
      background-color: #10b981; /* Fallback solid color */
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
      background-color: #6366f1; /* Fallback solid color */
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
      text-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 0 10px rgba(99,102,241,0.5);
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
      text-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 0 10px rgba(16,185,129,0.5);
    }
    /* Gmail auto-link prevention: separate spans for avnz, dot, io */
    .logo-text-part {
      color: #ffffff !important;
      text-decoration: none !important;
      border: none !important;
      text-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 0 10px rgba(16,185,129,0.5);
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
      color: #10b981;
      font-weight: 500;
    }

    /* Button */
    .button-container { text-align: center; padding: 8px 0 24px 0; }
    .button {
      display: inline-block;
      background-color: #10b981; /* Fallback solid color */
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 50px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
    }

    /* Features box */
    .features-box {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border-radius: 12px;
      padding: 20px 24px;
      margin: 20px 0;
    }
    .features-box h3 {
      color: #065f46;
      margin: 0 0 12px 0;
      font-size: 16px;
    }
    .features-box ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .features-box li {
      color: #047857;
      font-size: 14px;
      margin-bottom: 8px;
      padding-left: 24px;
      position: relative;
    }
    .features-box li:before {
      content: "✨";
      position: absolute;
      left: 0;
    }
    .features-box li:last-child {
      margin-bottom: 0;
    }

    /* Fun fact box */
    .fun-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-radius: 12px;
      padding: 16px 20px;
      margin: 20px 0;
    }
    .fun-box p {
      color: #92400e;
      margin: 0;
      font-size: 14px;
    }
    .fun-box strong {
      color: #78350f;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 24px 16px;
    }
    .footer p {
      color: #64748b;
      font-size: 12px;
      margin: 4px 0;
    }
    .footer a { color: #10b981; text-decoration: none; }

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
        <div class="card-header" style="background-color:#10b981;">
          <div class="logo-container">
            <div class="logo-icon" style="background-color:#6366f1;"><span class="logo-icon-letter" style="text-shadow:0 1px 2px rgba(0,0,0,0.3);">A</span></div><!--
            --><span class="logo-text" style="text-shadow:0 1px 2px rgba(0,0,0,0.3);"><span class="logo-text-part" style="color:#ffffff !important;text-decoration:none !important;text-shadow:0 1px 2px rgba(0,0,0,0.3);">avnz</span><span class="logo-text-part" style="color:#ffffff !important;text-decoration:none !important;text-shadow:0 1px 2px rgba(0,0,0,0.3);">.</span><span class="logo-text-part" style="color:#ffffff !important;text-decoration:none !important;text-shadow:0 1px 2px rgba(0,0,0,0.3);">io</span></span>
          </div>
          <h1>Welcome to the family! 🎉<br>You're officially one of us!</h1>
        </div>
        <div class="card-body">
          <p class="greeting">Hey {{userName}}! 👋</p>
          <p>We're doing a little happy dance over here because <span class="fun-text">you just joined {{companyName}}</span>! 💃🕺</p>
          <p>Your account is all set up and ready to rock. We've rolled out the virtual red carpet just for you—time to make some magic happen!</p>

          <div class="button-container">
            <a href="{{loginUrl}}" class="button">Let's Go! 🚀</a>
          </div>

          <div class="features-box">
            <h3>Here's what you can do (it's a lot!):</h3>
            <ul>
              <li>Process payments with our super-smart routing</li>
              <li>Watch your transactions flow in real-time</li>
              <li>Dive into analytics that actually make sense</li>
              <li>Manage customers like a total pro</li>
            </ul>
          </div>

          <div class="fun-box">
            <p><strong>🎯 Pro tip:</strong> Bookmark your dashboard now so you can jump right back in. Future you will thank present you!</p>
          </div>

          <p>Got questions? We've got answers! Hit us up anytime at <a href="mailto:{{supportEmail}}" style="color:#10b981;">{{supportEmail}}</a>. We're basically email ninjas—super fast and always ready to help. 🥷</p>
        </div>
      </div>

      <div class="footer">
        <p>Need help? We're always here at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
        <p>© {{currentYear}} AVNZ Platform • SOC2 & ISO 27001 Compliant</p>
        <p style="margin-top: 12px; color: #64748b;">Made with 💚 by the AVNZ team</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

const WELCOME_TEXT = `
Hey {{userName}}! 👋

Welcome to the family! 🎉 You're officially one of us!

We're doing a little happy dance over here because you just joined {{companyName}}! 💃🕺

Your account is all set up and ready to rock. We've rolled out the virtual red carpet just for you—time to make some magic happen!

🚀 Jump right in: {{loginUrl}}

Here's what you can do (it's a lot!):
✨ Process payments with our super-smart routing
✨ Watch your transactions flow in real-time
✨ Dive into analytics that actually make sense
✨ Manage customers like a total pro

🎯 Pro tip: Bookmark your dashboard now so you can jump right back in. Future you will thank present you!

Got questions? We've got answers! Hit us up anytime at {{supportEmail}}. We're basically email ninjas—super fast and always ready to help. 🥷

---
© {{currentYear}} AVNZ Platform • SOC2 & ISO 27001 Compliant
Made with 💚 by the AVNZ team
`;

const EMAIL_VERIFICATION_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>One quick thing! 📬</title>
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
      background-color: #3b82f6; /* Fallback solid color */
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
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
      background-color: #6366f1; /* Fallback solid color */
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
      text-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 0 10px rgba(59,130,246,0.5);
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
      text-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 0 10px rgba(59,130,246,0.5);
    }
    /* Gmail auto-link prevention: separate spans for avnz, dot, io */
    .logo-text-part {
      color: #ffffff !important;
      text-decoration: none !important;
      border: none !important;
      text-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 0 10px rgba(59,130,246,0.5);
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
      color: #3b82f6;
      font-weight: 500;
    }

    /* Button */
    .button-container { text-align: center; padding: 8px 0 24px 0; }
    .button {
      display: inline-block;
      background-color: #3b82f6; /* Fallback solid color */
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 50px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
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
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      border-radius: 12px;
      padding: 16px 20px;
      margin: 20px 0;
    }
    .fun-box p {
      color: #1e40af;
      margin: 0;
      font-size: 14px;
    }
    .fun-box strong {
      color: #1e3a8a;
    }

    /* Security notice */
    .security-notice {
      background: #fefce8;
      border-left: 4px solid #eab308;
      border-radius: 0 8px 8px 0;
      padding: 16px 20px;
      margin: 24px 0 0 0;
    }
    .security-notice p {
      color: #854d0e;
      margin: 0;
      font-size: 13px;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 24px 16px;
    }
    .footer p {
      color: #64748b;
      font-size: 12px;
      margin: 4px 0;
    }
    .footer a { color: #3b82f6; text-decoration: none; }

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
        <div class="card-header" style="background-color:#3b82f6;">
          <div class="logo-container">
            <div class="logo-icon" style="background-color:#6366f1;"><span class="logo-icon-letter" style="text-shadow:0 1px 2px rgba(0,0,0,0.3);">A</span></div><!--
            --><span class="logo-text" style="text-shadow:0 1px 2px rgba(0,0,0,0.3);"><span class="logo-text-part" style="color:#ffffff !important;text-decoration:none !important;text-shadow:0 1px 2px rgba(0,0,0,0.3);">avnz</span><span class="logo-text-part" style="color:#ffffff !important;text-decoration:none !important;text-shadow:0 1px 2px rgba(0,0,0,0.3);">.</span><span class="logo-text-part" style="color:#ffffff !important;text-decoration:none !important;text-shadow:0 1px 2px rgba(0,0,0,0.3);">io</span></span>
          </div>
          <h1>Just one tiny thing... 📬<br>Let's verify it's really you!</h1>
        </div>
        <div class="card-body">
          <p class="greeting">Hey {{userName}}! 👋</p>
          <p>Woohoo! You're <span class="fun-text">SO close</span> to unlocking all the awesome stuff we've got waiting for you! 🎁</p>
          <p>We just need to make sure this email belongs to a real human (you!) and not a sneaky robot. 🤖 One click and you're in!</p>

          <div class="button-container">
            <a href="{{verifyUrl}}" class="button">Yes, I'm Real! ✅</a>
          </div>

          <p class="link-text">
            <strong>Button not working?</strong> Copy this link instead:<br>{{verifyUrl}}
          </p>

          <div class="fun-box">
            <p><strong>🎯 Why verify?</strong> It keeps the bots out and the good vibes in! Plus, it means you'll never miss important updates about your account.</p>
          </div>

          <div class="security-notice">
            <p><strong>⏰ Heads up:</strong> This link expires in {{expiresIn}}—it's like Cinderella's carriage, but for emails! 🎃 If you didn't sign up for an account, just ignore this message. No harm done!</p>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Questions? We're here to help at <a href="mailto:support@avnz.io">support@avnz.io</a></p>
        <p>© {{currentYear}} AVNZ Platform • SOC2 & ISO 27001 Compliant</p>
        <p style="margin-top: 12px; color: #64748b;">Made with 💙 by the AVNZ team</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

const EMAIL_VERIFICATION_TEXT = `
Hey {{userName}}! 👋

Just one tiny thing... 📬 Let's verify it's really you!

Woohoo! You're SO close to unlocking all the awesome stuff we've got waiting for you! 🎁

We just need to make sure this email belongs to a real human (you!) and not a sneaky robot. 🤖 One click and you're in!

✅ Verify your email here: {{verifyUrl}}

🎯 Why verify? It keeps the bots out and the good vibes in! Plus, it means you'll never miss important updates about your account.

⏰ Heads up: This link expires in {{expiresIn}}—it's like Cinderella's carriage, but for emails! 🎃 If you didn't sign up for an account, just ignore this message. No harm done!

Questions? We're here to help at support@avnz.io

---
© {{currentYear}} AVNZ Platform • SOC2 & ISO 27001 Compliant
Made with 💙 by the AVNZ team
`;

const WAITLIST_INVITE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>You're In! Welcome, Founding Member! 🚀</title>
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
      background-color: #0f0f1a;
      width: 100% !important;
      min-width: 100%;
    }

    /* Container */
    .wrapper { width: 100%; table-layout: fixed; background-color: #0f0f1a; padding: 20px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #0f0f1a; }

    /* Card */
    .card {
      background: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%);
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(139, 92, 246, 0.2);
      margin: 10px 16px;
      overflow: hidden;
      border: 1px solid rgba(139, 92, 246, 0.2);
    }
    .card-header {
      background-color: #8b5cf6; /* Fallback solid color */
      background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f97316 100%);
      padding: 40px 24px;
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
      width: 56px;
      height: 56px;
      background-color: rgba(139, 92, 246, 0.8); /* Fallback solid color */
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      vertical-align: middle;
      text-align: center;
      line-height: 56px;
      margin-right: 12px;
    }
    .logo-icon-letter {
      color: #ffffff;
      font-size: 32px;
      font-weight: 800;
      font-family: system-ui, -apple-system, sans-serif;
      text-shadow: 0 1px 3px rgba(0,0,0,0.4), 0 0 10px rgba(139,92,246,0.5);
    }
    .logo-text {
      display: inline-block;
      font-size: 32px;
      font-weight: 800;
      color: #ffffff !important;
      text-decoration: none !important;
      border-bottom: none !important;
      vertical-align: middle;
      letter-spacing: -0.5px;
      font-family: system-ui, -apple-system, sans-serif;
      text-shadow: 0 1px 3px rgba(0,0,0,0.4), 0 0 10px rgba(139,92,246,0.5);
    }
    .logo-text-part {
      color: #ffffff !important;
      text-decoration: none !important;
      border: none !important;
      text-shadow: 0 1px 3px rgba(0,0,0,0.4), 0 0 10px rgba(139,92,246,0.5);
    }

    /* Typography */
    h1 {
      color: #ffffff;
      font-size: 26px;
      font-weight: 700;
      margin: 16px 0 0 0;
      line-height: 1.3;
      text-shadow: 0 2px 10px rgba(0,0,0,0.3);
    }
    .greeting {
      font-size: 20px;
      color: #ffffff;
      margin: 0 0 16px 0;
      font-weight: 600;
    }
    p { color: #a0aec0; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7; }
    .highlight-text {
      color: #c4b5fd;
      font-weight: 600;
    }

    /* Founder number badge */
    .founder-badge {
      display: inline-block;
      background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      padding: 8px 16px;
      border-radius: 50px;
      margin: 8px 0 16px 0;
      letter-spacing: 1px;
    }

    /* Button */
    .button-container { text-align: center; padding: 12px 0 28px 0; }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f97316 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 18px 48px;
      border-radius: 50px;
      font-weight: 700;
      font-size: 18px;
      box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
      transition: transform 0.2s, box-shadow 0.2s;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .button:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 32px rgba(139, 92, 246, 0.5);
    }

    /* Link fallback */
    .link-text {
      color: #718096;
      font-size: 12px;
      word-break: break-all;
      background: #1e1e3f;
      padding: 12px 16px;
      border-radius: 8px;
      margin: 16px 0;
      border: 1px solid #2d2d5a;
    }

    /* Perks box */
    .perks-box {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%);
      border-radius: 16px;
      padding: 24px;
      margin: 24px 0;
      border: 1px solid rgba(139, 92, 246, 0.3);
    }
    .perks-box h3 {
      color: #c4b5fd;
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 700;
    }
    .perks-box ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .perks-box li {
      color: #d8b4fe;
      font-size: 15px;
      margin-bottom: 12px;
      padding-left: 28px;
      position: relative;
    }
    .perks-box li:before {
      content: "🔥";
      position: absolute;
      left: 0;
    }
    .perks-box li:nth-child(2):before { content: "⚡"; }
    .perks-box li:nth-child(3):before { content: "🎁"; }
    .perks-box li:nth-child(4):before { content: "💎"; }
    .perks-box li:last-child { margin-bottom: 0; }

    /* Countdown box */
    .countdown-box {
      background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
      border-radius: 12px;
      padding: 16px 20px;
      margin: 20px 0;
      text-align: center;
    }
    .countdown-box p {
      color: #ffffff;
      margin: 0;
      font-size: 15px;
      font-weight: 600;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 24px 16px;
    }
    .footer p {
      color: #9ca3af;
      font-size: 12px;
      margin: 4px 0;
    }
    .footer a { color: #a78bfa; text-decoration: none; }

    /* Mobile responsive */
    @media only screen and (max-width: 480px) {
      .card { margin: 10px 12px; }
      .card-header { padding: 32px 20px; }
      .card-body { padding: 24px 20px; }
      .logo-icon { width: 48px; height: 48px; line-height: 48px; border-radius: 12px; margin-right: 10px; }
      .logo-icon-letter { font-size: 28px; }
      .logo-text { font-size: 28px; }
      h1 { font-size: 22px; }
      .button { padding: 16px 36px; font-size: 16px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="card">
        <div class="card-header" style="background-color:#8b5cf6;">
          <div class="logo-container">
            <div class="logo-icon" style="background-color:rgba(139,92,246,0.8);"><span class="logo-icon-letter" style="text-shadow:0 1px 3px rgba(0,0,0,0.4);">A</span></div><!--
            --><span class="logo-text" style="text-shadow:0 1px 3px rgba(0,0,0,0.4);"><span class="logo-text-part" style="color:#ffffff !important;text-decoration:none !important;text-shadow:0 1px 3px rgba(0,0,0,0.4);">avnz</span><span class="logo-text-part" style="color:#ffffff !important;text-decoration:none !important;text-shadow:0 1px 3px rgba(0,0,0,0.4);">.</span><span class="logo-text-part" style="color:#ffffff !important;text-decoration:none !important;text-shadow:0 1px 3px rgba(0,0,0,0.4);">io</span></span>
          </div>
          <h1>🎉 You Made It, Founder!<br>Your VIP Pass is Here!</h1>
        </div>
        <div class="card-body">
          <p class="greeting">Hey {{userName}}! 👋</p>
          <div class="founder-badge">FOUNDER {{founderNumber}}</div>
          <p>Holy smokes! 🤯 You've been <span class="highlight-text">hand-picked from our waitlist</span> to join the exclusive group of founding members at AVNZ!</p>
          <p>You were #{{position}} on the waitlist, and now you're about to become part of something <span class="highlight-text">absolutely legendary</span>. We've been building something special, and we want YOU to help shape the future of payment technology! 🚀</p>

          <div class="button-container">
            <a href="{{inviteUrl}}" class="button">Claim My Founder Spot 🎯</a>
          </div>

          <p class="link-text">
            <strong>Link not working?</strong> Copy this instead:<br>{{inviteUrl}}
          </p>

          <div class="perks-box">
            <h3>Your Founding Member Perks:</h3>
            <ul>
              <li><strong>Founder pricing forever</strong> – locked in, no matter how big we grow</li>
              <li><strong>Early access</strong> – test new features before anyone else</li>
              <li><strong>Direct line to our team</strong> – your feedback shapes the product</li>
              <li><strong>Exclusive founder badge</strong> – flex your early adopter status</li>
            </ul>
          </div>

          <div class="countdown-box">
            <p>⏰ This invite expires in {{expiresIn}} – don't let it slip away!</p>
          </div>

          <p style="color: #e2e8f0; font-size: 15px;">This is your moment, {{userName}}! Click the button above, set up your account, and let's build the future of payments together. We literally can't do this without founders like you! 💜</p>
        </div>
      </div>

      <div class="footer">
        <p>Questions? Hit us up at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
        <p>© {{currentYear}} AVNZ Platform • For Founders, By Founders</p>
        <p style="margin-top: 12px; color: #a78bfa;">Made with 🔥 by the AVNZ team</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

const WAITLIST_INVITE_TEXT = `
🎉 YOU MADE IT, FOUNDER! YOUR VIP PASS IS HERE!

Hey {{userName}}! 👋

FOUNDER {{founderNumber}}

Holy smokes! 🤯 You've been hand-picked from our waitlist to join the exclusive group of founding members at AVNZ!

You were #{{position}} on the waitlist, and now you're about to become part of something absolutely legendary. We've been building something special, and we want YOU to help shape the future of payment technology! 🚀

🎯 CLAIM YOUR FOUNDER SPOT NOW:
{{inviteUrl}}

YOUR FOUNDING MEMBER PERKS:
🔥 Founder pricing forever – locked in, no matter how big we grow
⚡ Early access – test new features before anyone else
🎁 Direct line to our team – your feedback shapes the product
💎 Exclusive founder badge – flex your early adopter status

⏰ HEADS UP: This invite expires in {{expiresIn}} – don't let it slip away!

This is your moment, {{userName}}! Click the link above, set up your account, and let's build the future of payments together. We literally can't do this without founders like you! 💜

Questions? Hit us up at {{supportEmail}}

---
© {{currentYear}} AVNZ Platform • For Founders, By Founders
Made with 🔥 by the AVNZ team
`;

// ═══════════════════════════════════════════════════════════════
// ABANDONED CART RECOVERY EMAILS - "Engineered Reality" Style
// Non-Verbal Communication Influence / Immersive Experience
// ═══════════════════════════════════════════════════════════════

const ABANDONED_CART_1_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>Your cart is waiting</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      background-color: #0a0a0f;
      width: 100% !important;
    }
    .wrapper { width: 100%; table-layout: fixed; background-color: #0a0a0f; padding: 24px 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .card {
      background: linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%);
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(102, 126, 234, 0.15);
      margin: 0 16px;
      overflow: hidden;
      border: 1px solid rgba(102, 126, 234, 0.2);
    }
    .card-header {
      background-color: #667eea; /* Fallback solid color */
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .card-body { padding: 32px 24px; }
    .logo-text {
      font-size: 28px;
      font-weight: 800;
      color: #ffffff !important;
      text-decoration: none !important;
      text-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 0 10px rgba(102,126,234,0.5);
    }
    h1 {
      color: #ffffff;
      font-size: 26px;
      font-weight: 700;
      margin: 20px 0 0 0;
      line-height: 1.3;
      text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .greeting {
      font-size: 18px;
      color: #ffffff;
      margin: 0 0 16px 0;
      font-weight: 600;
    }
    p { color: #a0aec0; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7; }
    .highlight { color: #a78bfa; font-weight: 500; }
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
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
      min-height: 48px;
    }
    .cart-preview {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 20px;
      margin: 24px 0;
    }
    .cart-preview h3 {
      color: #ffffff;
      font-size: 16px;
      margin: 0 0 16px 0;
      text-align: center;
    }
    .cart-total {
      background: rgba(102, 126, 234, 0.1);
      border: 1px solid rgba(102, 126, 234, 0.2);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      margin-top: 16px;
    }
    .cart-total-label { color: #a0aec0; font-size: 14px; margin: 0 0 4px 0; }
    .cart-total-value { color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; }
    .tip-box {
      background: linear-gradient(135deg, rgba(167, 139, 250, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
      border-radius: 12px;
      padding: 16px 20px;
      margin: 20px 0;
      border: 1px solid rgba(167, 139, 250, 0.2);
    }
    .tip-box p { color: #c4b5fd; margin: 0; font-size: 14px; }
    .footer { text-align: center; padding: 24px 16px; }
    .footer p { color: #9ca3af; font-size: 12px; margin: 4px 0; }
    .footer a { color: #a78bfa; text-decoration: none; }
    @media only screen and (max-width: 480px) {
      .card { margin: 0 12px; }
      .card-header { padding: 24px 20px; }
      .card-body { padding: 24px 20px; }
      h1 { font-size: 22px; }
      .button { padding: 14px 32px; width: 100%; box-sizing: border-box; }
    }
  </style>
</head>
<body>
  <div style="display:none;max-height:0;overflow:hidden;">Your items are still waiting. And honestly? They looked really good on you.</div>
  <div class="wrapper">
    <div class="container">
      <div class="card">
        <div class="card-header" style="background-color:#667eea;">
          <span class="logo-text" style="text-shadow:0 1px 3px rgba(0,0,0,0.3);">{{companyName}}</span>
          <h1 style="text-shadow:0 1px 2px rgba(0,0,0,0.2);">Still thinking it over?</h1>
        </div>
        <div class="card-body">
          <p class="greeting">Hey {{userName}}!</p>
          <p>Something interrupted you earlier. Life happens - we get it. But before you move on, can we paint a quick picture?</p>
          <p>Close your eyes for a second. (Okay, maybe keep one open so you can read this.)</p>
          <p>Imagine tomorrow morning. You wake up, stretch, and there it is - <span class="highlight">that package on your doorstep</span>. You know the feeling. That little rush when you tear open the box and finally hold something you've been thinking about.</p>
          <p>That could be your tomorrow.</p>
          <p>Right now, your cart is sitting exactly where you left it. Everything selected, everything ready. Like a friend saving your spot in line.</p>

          <div class="cart-preview">
            <h3>Still waiting for you:</h3>
            <p style="text-align:center;color:#e2e8f0;">{{cartItemsSummary}}</p>
            <div class="cart-total">
              <p class="cart-total-label">Cart Total</p>
              <p class="cart-total-value">{{cartTotal}}</p>
            </div>
          </div>

          <div class="button-container">
            <a href="{{recoveryUrl}}" class="button">Complete My Order</a>
          </div>

          <div class="tip-box">
            <p><strong>Fun fact:</strong> 73% of people who come back to their cart within the first few hours end up loving their purchase. Just saying.</p>
          </div>

          <p style="text-align:center;color:#9ca3af;font-size:14px;">No pressure. No countdown timers screaming at you. Just a friendly tap on the shoulder.</p>
        </div>
      </div>
      <div class="footer">
        <p>Need help? We're here at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
        <p><a href="{{unsubscribeUrl}}">Unsubscribe</a> | <a href="{{preferencesUrl}}">Email Preferences</a></p>
        <p>© {{currentYear}} {{companyName}}</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

const ABANDONED_CART_1_TEXT = `
Hey {{userName}}!

Your cart's getting lonely...

Something interrupted you earlier. Life happens - we get it.

Imagine tomorrow morning. You wake up, stretch, and there it is - that package on your doorstep. You know the feeling. That little rush when you tear open the box and finally hold something you've been thinking about.

That could be your tomorrow.

STILL WAITING FOR YOU:
{{cartItemsSummary}}

Cart Total: {{cartTotal}}

Complete your order: {{recoveryUrl}}

Fun fact: 73% of people who come back to their cart within the first few hours end up loving their purchase. Just saying.

No pressure. Just a friendly tap on the shoulder.

---
Need help? {{supportEmail}}
Unsubscribe: {{unsubscribeUrl}}
© {{currentYear}} {{companyName}}
`;

const ABANDONED_CART_2_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>A little something for the undecided</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      background-color: #0a0a0f;
      width: 100% !important;
    }
    .wrapper { width: 100%; table-layout: fixed; background-color: #0a0a0f; padding: 24px 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .discount-banner {
      background-color: #10b981; /* Fallback solid color */
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 12px 24px;
      text-align: center;
    }
    .discount-banner p {
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      margin: 0;
      letter-spacing: 1px;
      text-transform: uppercase;
      text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .card {
      background-color: #203a43; /* Fallback solid color */
      background: linear-gradient(180deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
      border-radius: 0 0 20px 20px;
      box-shadow: 0 8px 32px rgba(16, 185, 129, 0.15);
      margin: 0 16px;
      overflow: hidden;
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-top: none;
    }
    .card-body { padding: 32px 24px; }
    .discount-badge {
      width: 100px;
      height: 100px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 50%;
      margin: 0 auto 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(16, 185, 129, 0.4);
    }
    .discount-badge span {
      color: #ffffff;
      font-size: 28px;
      font-weight: 800;
    }
    .greeting {
      font-size: 18px;
      color: #ffffff;
      margin: 0 0 16px 0;
      font-weight: 600;
      text-align: center;
      text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    h1 {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 12px 0;
      text-align: center;
      text-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    p { color: #d1d5db; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7; }
    .highlight { color: #6ee7b7; font-weight: 500; }
    .code-display {
      text-align: center;
      margin: 20px 0;
    }
    .code-display span {
      background-color: rgba(16, 185, 129, 0.2); /* Fallback */
      background: rgba(16, 185, 129, 0.2);
      color: #6ee7b7;
      padding: 8px 20px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 2px;
    }
    .button-container { text-align: center; padding: 8px 0 24px 0; }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 50px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
      min-height: 48px;
    }
    .cart-preview {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 20px;
      margin: 24px 0;
    }
    .cart-preview h3 {
      color: #ffffff;
      font-size: 16px;
      margin: 0 0 16px 0;
      text-align: center;
    }
    .price-comparison {
      text-align: center;
      margin-top: 16px;
    }
    .original-price {
      color: #9ca3af;
      font-size: 16px;
      text-decoration: line-through;
    }
    .new-price {
      color: #10b981;
      font-size: 28px;
      font-weight: 700;
      margin-left: 12px;
    }
    .savings-badge {
      display: inline-block;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 50px;
      margin-top: 8px;
    }
    .footer { text-align: center; padding: 24px 16px; }
    .footer p { color: #9ca3af; font-size: 12px; margin: 4px 0; }
    .footer a { color: #6ee7b7; text-decoration: none; }
    @media only screen and (max-width: 480px) {
      .card { margin: 0 12px; }
      .card-body { padding: 24px 20px; }
      h1 { font-size: 24px; }
      .button { padding: 14px 32px; width: 100%; box-sizing: border-box; }
    }
  </style>
</head>
<body>
  <div style="display:none;max-height:0;overflow:hidden;">We don't do this often. But for you, {{userName}}? Yeah, we're doing this.</div>
  <div class="wrapper">
    <div class="container">
      <div class="discount-banner" style="background-color:#10b981;">
        <p style="text-shadow:0 1px 2px rgba(0,0,0,0.2);">EXCLUSIVE: {{discountPercent}}% OFF YOUR CART</p>
      </div>
      <div class="card" style="background-color:#203a43;">
        <div class="card-body">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <div style="width:100px;height:100px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:50%;text-align:center;line-height:100px;margin-bottom:24px;">
                <span style="color:#ffffff;font-size:28px;font-weight:800;">{{discountPercent}}%</span>
              </div>
            </td></tr>
          </table>
          <h1>Good taste deserves a reward</h1>
          <p class="greeting" style="text-align:center;">Hey {{userName}}!</p>

          <p>You know that moment when you're standing in front of the fridge at midnight, door open, cold air on your face, just... deciding? That's where you are with your cart right now. Let us help you close the door.</p>

          <p>Here's the thing about great decisions: they don't always happen on the first try. Sometimes you need to walk away, think about it, let it breathe.</p>

          <p>And then sometimes? <span class="highlight">The universe sends you a sign.</span></p>

          <p><strong>Consider this your sign.</strong></p>

          <p>For the next {{expiresIn}}, we're taking <span class="highlight">{{discountPercent}}% off</span> your entire order. Not because we're desperate (we're really not). But because we believe in what's waiting in that cart, and we think you will too.</p>

          <div class="code-display">
            <span>{{discountCode}}</span>
          </div>

          <div class="cart-preview">
            <h3>What's been on your mind:</h3>
            <p style="text-align:center;color:#e2e8f0;">{{cartItemsSummary}}</p>
            <div class="price-comparison">
              <span class="original-price">{{cartTotal}}</span>
              <span class="new-price">{{discountedTotal}}</span>
              <br>
              <span class="savings-badge">You save {{discountPercent}}%!</span>
            </div>
          </div>

          <div class="button-container">
            <a href="{{recoveryUrl}}?code={{discountCode}}" class="button">Claim My {{discountPercent}}% Off</a>
          </div>

          <p style="text-align:center;color:#9ca3af;font-size:14px;">This isn't about the discount (though it's nice, right?). It's about you finally getting that thing you clearly wanted.</p>
        </div>
      </div>
      <div class="footer">
        <p>Need help? We're here at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
        <p><a href="{{unsubscribeUrl}}">Unsubscribe</a> | <a href="{{preferencesUrl}}">Email Preferences</a></p>
        <p>© {{currentYear}} {{companyName}}</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

const ABANDONED_CART_2_TEXT = `
EXCLUSIVE: {{discountPercent}}% OFF YOUR CART

Hey {{userName}}!

A little something for the undecided...

You know that moment when you're standing in front of the fridge at midnight, door open, cold air on your face, just... deciding?

That's where you are with your cart right now. Let us help you close the door.

And then sometimes? The universe sends you a sign.

Consider this your sign.

For the next {{expiresIn}}, we're taking {{discountPercent}}% off your entire order.

USE CODE: {{discountCode}}

WHAT'S BEEN ON YOUR MIND:
{{cartItemsSummary}}

Original: {{cartTotal}}
Your Price: {{discountedTotal}}
You save {{discountPercent}}%!

Claim your discount: {{recoveryUrl}}?code={{discountCode}}

This isn't about the discount (though it's nice, right?). It's about you finally getting that thing you clearly wanted.

---
Need help? {{supportEmail}}
Unsubscribe: {{unsubscribeUrl}}
© {{currentYear}} {{companyName}}
`;

const ABANDONED_CART_3_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>Last call - Your cart expires tonight</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      background-color: #0a0a0f;
      width: 100% !important;
    }
    .wrapper { width: 100%; table-layout: fixed; background-color: #0a0a0f; padding: 24px 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .urgency-banner {
      background-color: #dc2626; /* Fallback solid color */
      background: linear-gradient(90deg, #dc2626 0%, #ea580c 50%, #f59e0b 100%);
      padding: 16px 24px;
      text-align: center;
    }
    .urgency-banner p {
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      margin: 0;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }
    .card {
      background-color: #2d1515; /* Fallback solid color */
      background: linear-gradient(180deg, #1a0a0a 0%, #2d1515 50%, #1a0a0a 100%);
      border-radius: 0 0 20px 20px;
      box-shadow: 0 0 30px rgba(220, 38, 38, 0.2), 0 0 60px rgba(220, 38, 38, 0.1);
      margin: 0 16px;
      overflow: hidden;
      border: 1px solid rgba(220, 38, 38, 0.3);
      border-top: none;
    }
    .card-body { padding: 32px 24px; }
    .time-pill {
      display: inline-block;
      background-color: #dc2626; /* Fallback solid color */
      background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%);
      padding: 8px 20px;
      border-radius: 50px;
      margin-bottom: 24px;
    }
    .time-pill span {
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .discount-badge {
      width: 120px;
      height: 120px;
      background-color: #dc2626; /* Fallback solid color */
      background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%);
      border-radius: 50%;
      margin: 0 auto 24px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(220, 38, 38, 0.5);
    }
    .discount-badge-inner {
      padding-top: 30px;
    }
    .discount-badge-percent {
      color: #ffffff;
      font-size: 36px;
      font-weight: 800;
      line-height: 1;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .discount-badge-off {
      color: rgba(255,255,255,0.8);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    h1 {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 12px 0;
      text-align: center;
      text-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    p { color: #fca5a5; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7; }
    .white-text { color: #ffffff; }
    .highlight { color: #f87171; font-weight: 600; }
    .code-display {
      text-align: center;
      margin: 20px 0;
    }
    .code-display span {
      background-color: rgba(220, 38, 38, 0.3); /* Fallback */
      background: rgba(220, 38, 38, 0.3);
      color: #ffffff;
      padding: 8px 20px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 2px;
    }
    .button-container { text-align: center; padding: 8px 0 24px 0; }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 18px 48px;
      border-radius: 50px;
      font-weight: 700;
      font-size: 17px;
      box-shadow: 0 4px 20px rgba(220, 38, 38, 0.5), 0 8px 40px rgba(234, 88, 12, 0.3);
      min-height: 48px;
    }
    .cart-preview {
      background: rgba(220, 38, 38, 0.08);
      border: 1px solid rgba(220, 38, 38, 0.3);
      border-radius: 16px;
      padding: 20px;
      margin: 24px 0;
    }
    .cart-preview h3 {
      color: #ffffff;
      font-size: 16px;
      margin: 0 0 16px 0;
      text-align: center;
    }
    .price-comparison {
      text-align: center;
      margin-top: 16px;
    }
    .original-price {
      color: #9ca3af;
      font-size: 16px;
      text-decoration: line-through;
    }
    .new-price {
      color: #f87171;
      font-size: 28px;
      font-weight: 700;
      margin-left: 12px;
    }
    .savings-badge {
      display: inline-block;
      background: rgba(220, 38, 38, 0.2);
      color: #f87171;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 50px;
      margin-top: 8px;
    }
    .secondary-cta {
      text-align: center;
      margin-top: 16px;
    }
    .secondary-cta a {
      color: #9ca3af;
      font-size: 14px;
      text-decoration: underline;
    }
    .ps-box {
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
      padding: 16px 20px;
      margin-top: 24px;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .ps-box p { color: #e2e8f0; margin: 0; font-size: 14px; }
    .footer { text-align: center; padding: 24px 16px; }
    .footer p { color: #9ca3af; font-size: 12px; margin: 4px 0; }
    .footer a { color: #fca5a5; text-decoration: none; }
    @media only screen and (max-width: 480px) {
      .card { margin: 0 12px; }
      .card-body { padding: 24px 20px; }
      h1 { font-size: 24px; }
      .button { padding: 16px 36px; width: 100%; box-sizing: border-box; }
    }
  </style>
</head>
<body>
  <div style="display:none;max-height:0;overflow:hidden;">{{discountPercent}}% off. Cart expires tonight. This is us being genuinely, honestly real with you.</div>
  <div class="wrapper">
    <div class="container">
      <div class="urgency-banner" style="background-color:#dc2626;">
        <p style="text-shadow:0 1px 2px rgba(0,0,0,0.3);">FINAL NOTICE: {{discountPercent}}% OFF EXPIRES TONIGHT</p>
      </div>
      <div class="card" style="background-color:#2d1515;">
        <div class="card-body">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <div class="time-pill" style="background-color:#dc2626;">
                <span style="text-shadow:0 1px 2px rgba(0,0,0,0.2);">Expires in {{expiresIn}}</span>
              </div>
            </td></tr>
            <tr><td align="center">
              <div class="discount-badge" style="background-color:#dc2626;">
                <div class="discount-badge-inner">
                  <span class="discount-badge-percent" style="text-shadow:0 2px 4px rgba(0,0,0,0.3);">{{discountPercent}}%</span><br>
                  <span class="discount-badge-off" style="text-shadow:0 1px 2px rgba(0,0,0,0.2);">OFF</span>
                </div>
              </div>
            </td></tr>
          </table>

          <h1 style="text-shadow:0 1px 3px rgba(0,0,0,0.3);">Last call, {{userName}}</h1>

          <p class="white-text">This is the email where we're supposed to create fake urgency. Flashing timers, ALL CAPS warnings, the whole anxiety-inducing circus. But that's not us. So here's the truth instead:</p>

          <p class="white-text"><strong class="highlight">Your cart disappears tonight.</strong></p>

          <p>Not because we're playing games. Because our systems automatically clear abandoned carts, and yours has been sitting there for three days. We've been holding it together with digital duct tape, but even that has its limits.</p>

          <p class="white-text">You added those items for a reason. Maybe it was late at night and the credit card felt too far away. Maybe something else demanded your attention. Maybe you just needed to think.</p>

          <p class="white-text">Three days is a lot of thinking.</p>

          <p class="white-text"><strong>{{discountPercent}}% off. Everything in your cart. Final offer.</strong></p>

          <div class="code-display">
            <span>{{discountCode}}</span>
          </div>

          <div class="cart-preview">
            <h3>Your cart's final curtain call:</h3>
            <p style="text-align:center;color:#e2e8f0;">{{cartItemsSummary}}</p>
            <div class="price-comparison">
              <span class="original-price">{{cartTotal}}</span>
              <span class="new-price">{{discountedTotal}}</span>
              <br>
              <span class="savings-badge">You save {{discountPercent}}%!</span>
            </div>
          </div>

          <div class="button-container">
            <a href="{{recoveryUrl}}?code={{discountCode}}" class="button">Get My {{discountPercent}}% Off Now</a>
          </div>

          <div class="secondary-cta">
            <a href="{{clearCartUrl}}">I've moved on - clear my cart</a>
          </div>

          <div class="ps-box">
            <p><strong>P.S.</strong> - If you've already bought somewhere else, no hard feelings. Really. But if you're still undecided, ask yourself: when you picture your life with vs. without what's in this cart, which version feels better? Trust that answer. Then click accordingly.</p>
          </div>
        </div>
      </div>
      <div class="footer">
        <p>Need help? We're here at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
        <p><a href="{{unsubscribeUrl}}">Unsubscribe</a> | <a href="{{preferencesUrl}}">Email Preferences</a></p>
        <p>© {{currentYear}} {{companyName}}</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

const ABANDONED_CART_3_TEXT = `
FINAL NOTICE: {{discountPercent}}% OFF EXPIRES TONIGHT

Last call, {{userName}}. We mean it this time.

This is the email where we're supposed to create fake urgency. Flashing timers, ALL CAPS warnings, the whole anxiety-inducing circus. But that's not us. So here's the truth instead:

YOUR CART DISAPPEARS TONIGHT.

Not because we're playing games. Because our systems automatically clear abandoned carts, and yours has been sitting there for three days.

You added those items for a reason. Three days is a lot of thinking.

{{discountPercent}}% off. Everything in your cart. Final offer.

USE CODE: {{discountCode}}

YOUR CART'S FINAL CURTAIN CALL:
{{cartItemsSummary}}

Original: {{cartTotal}}
Your Price: {{discountedTotal}}
You save {{discountPercent}}%!

Claim your discount: {{recoveryUrl}}?code={{discountCode}}

Don't want it anymore? Clear your cart: {{clearCartUrl}}

P.S. - If you've already bought somewhere else, no hard feelings. But if you're still undecided, ask yourself: when you picture your life with vs. without what's in this cart, which version feels better? Trust that answer.

---
Need help? {{supportEmail}}
Unsubscribe: {{unsubscribeUrl}}
© {{currentYear}} {{companyName}}
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
    {
      code: 'waitlist-invite',
      name: 'Waitlist Invite',
      description: 'Email sent to invite waitlist members to register as founding members',
      category: EmailTemplateCategory.AUTHENTICATION,
      subject: '🎉 You\'re In! Welcome, Founder {{founderNumber}}!',
      htmlBody: WAITLIST_INVITE_HTML.trim(),
      textBody: WAITLIST_INVITE_TEXT.trim(),
      fromName: 'AVNZ Platform',
      fromEmail: 'noreply@avnz.io',
      replyTo: 'support@avnz.io',
      isSystem: true,
      isActive: true,
      variables: [
        { name: 'userName', type: 'string', required: true, description: 'User\'s name or email prefix' },
        { name: 'founderNumber', type: 'string', required: true, description: 'Founder number (e.g., FND-0001)' },
        { name: 'position', type: 'number', required: true, description: 'User\'s position on the waitlist' },
        { name: 'companyName', type: 'string', required: false, description: 'User\'s company name (if provided)' },
        { name: 'inviteUrl', type: 'url', required: true, description: 'Registration URL with invite token' },
        { name: 'expiresIn', type: 'string', required: true, description: 'Token expiration time (e.g., "7 days")' },
        { name: 'supportEmail', type: 'string', required: true, description: 'Support email address' },
      ],
    },
    // ═══════════════════════════════════════════════════════════════
    // ABANDONED CART RECOVERY EMAIL TEMPLATES
    // "Non-Verbal Communication Influence / Engineered Reality" Style
    // ═══════════════════════════════════════════════════════════════
    {
      code: 'abandoned-cart-1',
      name: 'Abandoned Cart Recovery - Email 1',
      description: 'First recovery email sent 1 hour after cart abandonment (no discount, warm reminder)',
      category: EmailTemplateCategory.MARKETING,
      subject: "Your cart's getting lonely, {{userName}}",
      htmlBody: ABANDONED_CART_1_HTML.trim(),
      textBody: ABANDONED_CART_1_TEXT.trim(),
      fromName: '{{companyName}}',
      fromEmail: 'noreply@avnz.io',
      replyTo: '{{supportEmail}}',
      isSystem: true,
      isActive: true,
      variables: [
        { name: 'userName', type: 'string', required: true, description: 'Customer name or email prefix' },
        { name: 'companyName', type: 'string', required: true, description: 'Company/store name' },
        { name: 'logoUrl', type: 'url', required: false, description: 'Company logo URL' },
        { name: 'supportEmail', type: 'string', required: true, description: 'Support email address' },
        { name: 'cartItems', type: 'array', required: true, description: 'Array of cart items with name, imageUrl, price, quantity' },
        { name: 'cartTotal', type: 'string', required: true, description: 'Formatted cart total (e.g., "$124.99")' },
        { name: 'recoveryUrl', type: 'url', required: true, description: 'URL to recover/continue checkout' },
        { name: 'unsubscribeUrl', type: 'url', required: true, description: 'Unsubscribe link URL' },
        { name: 'preferencesUrl', type: 'url', required: false, description: 'Email preferences URL' },
        { name: 'currentYear', type: 'string', required: true, description: 'Current year for copyright' },
      ],
    },
    {
      code: 'abandoned-cart-2',
      name: 'Abandoned Cart Recovery - Email 2',
      description: 'Second recovery email sent 24 hours after abandonment (10% discount, gentle nudge)',
      category: EmailTemplateCategory.MARKETING,
      subject: 'A little something for the undecided',
      htmlBody: ABANDONED_CART_2_HTML.trim(),
      textBody: ABANDONED_CART_2_TEXT.trim(),
      fromName: '{{companyName}}',
      fromEmail: 'noreply@avnz.io',
      replyTo: '{{supportEmail}}',
      isSystem: true,
      isActive: true,
      variables: [
        { name: 'userName', type: 'string', required: true, description: 'Customer name or email prefix' },
        { name: 'companyName', type: 'string', required: true, description: 'Company/store name' },
        { name: 'logoUrl', type: 'url', required: false, description: 'Company logo URL' },
        { name: 'supportEmail', type: 'string', required: true, description: 'Support email address' },
        { name: 'cartItems', type: 'array', required: true, description: 'Array of cart items with name, imageUrl, price, quantity' },
        { name: 'cartTotal', type: 'string', required: true, description: 'Original cart total' },
        { name: 'discountedTotal', type: 'string', required: true, description: 'Cart total after discount' },
        { name: 'discountPercent', type: 'number', required: true, description: 'Discount percentage (e.g., 10)' },
        { name: 'discountCode', type: 'string', required: true, description: 'Discount code to apply' },
        { name: 'expiresIn', type: 'string', required: true, description: 'Discount expiration (e.g., "48 hours")' },
        { name: 'recoveryUrl', type: 'url', required: true, description: 'URL to recover/continue checkout' },
        { name: 'unsubscribeUrl', type: 'url', required: true, description: 'Unsubscribe link URL' },
        { name: 'preferencesUrl', type: 'url', required: false, description: 'Email preferences URL' },
        { name: 'currentYear', type: 'string', required: true, description: 'Current year for copyright' },
      ],
    },
    {
      code: 'abandoned-cart-3',
      name: 'Abandoned Cart Recovery - Email 3 (Final)',
      description: 'Final recovery email sent 72 hours after abandonment (15% discount, genuine urgency)',
      category: EmailTemplateCategory.MARKETING,
      subject: 'Last call, {{userName}}. We mean it this time.',
      htmlBody: ABANDONED_CART_3_HTML.trim(),
      textBody: ABANDONED_CART_3_TEXT.trim(),
      fromName: '{{companyName}}',
      fromEmail: 'noreply@avnz.io',
      replyTo: '{{supportEmail}}',
      isSystem: true,
      isActive: true,
      variables: [
        { name: 'userName', type: 'string', required: true, description: 'Customer name or email prefix' },
        { name: 'companyName', type: 'string', required: true, description: 'Company/store name' },
        { name: 'logoUrl', type: 'url', required: false, description: 'Company logo URL' },
        { name: 'supportEmail', type: 'string', required: true, description: 'Support email address' },
        { name: 'cartItems', type: 'array', required: true, description: 'Array of cart items with name, imageUrl, price, quantity' },
        { name: 'cartTotal', type: 'string', required: true, description: 'Original cart total' },
        { name: 'discountedTotal', type: 'string', required: true, description: 'Cart total after discount' },
        { name: 'discountPercent', type: 'number', required: true, description: 'Discount percentage (e.g., 15)' },
        { name: 'discountCode', type: 'string', required: true, description: 'Discount code to apply' },
        { name: 'expiresIn', type: 'string', required: true, description: 'Cart expiration (e.g., "midnight tonight")' },
        { name: 'recoveryUrl', type: 'url', required: true, description: 'URL to recover/continue checkout' },
        { name: 'clearCartUrl', type: 'url', required: false, description: 'URL to clear/abandon cart (secondary CTA)' },
        { name: 'unsubscribeUrl', type: 'url', required: true, description: 'Unsubscribe link URL' },
        { name: 'preferencesUrl', type: 'url', required: false, description: 'Email preferences URL' },
        { name: 'currentYear', type: 'string', required: true, description: 'Current year for copyright' },
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
