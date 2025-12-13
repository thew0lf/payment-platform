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
      color: #10b981;
      font-weight: 500;
    }

    /* Button */
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
      color: #a0aec0;
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
        <div class="card-header">
          <div class="logo-container">
            <div class="logo-icon"><span class="logo-icon-letter">A</span></div><!--
            --><span class="logo-text" style="color:#ffffff !important;text-decoration:none !important;border:none !important;">avnz<span style="font-size:0;">&#8203;</span>.io</span>
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
        <p style="margin-top: 12px; color: #cbd5e0;">Made with 💚 by the AVNZ team</p>
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
      color: #3b82f6;
      font-weight: 500;
    }

    /* Button */
    .button-container { text-align: center; padding: 8px 0 24px 0; }
    .button {
      display: inline-block;
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
      color: #a0aec0;
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
        <div class="card-header">
          <div class="logo-container">
            <div class="logo-icon"><span class="logo-icon-letter">A</span></div><!--
            --><span class="logo-text" style="color:#ffffff !important;text-decoration:none !important;border:none !important;">avnz<span style="font-size:0;">&#8203;</span>.io</span>
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
        <p style="margin-top: 12px; color: #cbd5e0;">Made with 💙 by the AVNZ team</p>
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
