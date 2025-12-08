import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  } : undefined,
});

const FROM_EMAIL = 'founders@avnz.io';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://founders.avnz.io';

interface WelcomeEmailData {
  email: string;
  founderNumber: string;
  referralCode: string;
  referralLink: string;
  position: number;
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  const { email, founderNumber, referralCode, referralLink, position } = data;

  const command = new SendEmailCommand({
    Source: FROM_EMAIL,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: `Welcome, Founder ${founderNumber}! 🎉`,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: getWelcomeEmailHtml(data),
          Charset: 'UTF-8',
        },
        Text: {
          Data: getWelcomeEmailText(data),
          Charset: 'UTF-8',
        },
      },
    },
  });

  try {
    await ses.send(command);
    return true;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return false;
  }
}

interface VerificationEmailData {
  email: string;
  founderNumber: string;
  verificationToken: string;
}

export async function sendVerificationEmail(data: VerificationEmailData): Promise<boolean> {
  const { email, founderNumber, verificationToken } = data;
  const verificationLink = `${BASE_URL}/api/verify/email?token=${verificationToken}`;

  const command = new SendEmailCommand({
    Source: FROM_EMAIL,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: `Verify your email, Founder ${founderNumber}`,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: getVerificationEmailHtml({ ...data, verificationLink }),
          Charset: 'UTF-8',
        },
        Text: {
          Data: getVerificationEmailText({ ...data, verificationLink }),
          Charset: 'UTF-8',
        },
      },
    },
  });

  try {
    await ses.send(command);
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

function getWelcomeEmailHtml(data: WelcomeEmailData): string {
  const { founderNumber, referralCode, referralLink, position } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%); border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center;">
      <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 16px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 32px; font-weight: bold;">A</span>
      </div>
      <h1 style="color: white; margin: 0 0 8px; font-size: 28px; font-weight: 700;">Welcome to avnz.io!</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">You're officially a Founder</p>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 40px 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <!-- Founder Number Card -->
      <div style="background: linear-gradient(135deg, #18181b 0%, #27272a 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
        <p style="color: #a1a1aa; margin: 0 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Your Founder Number</p>
        <p style="color: white; margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 0.05em;">${founderNumber}</p>
        <p style="color: #6366f1; margin: 8px 0 0; font-size: 14px;">Position #${position.toLocaleString()}</p>
      </div>

      <p style="color: #3f3f46; margin: 0 0 24px; font-size: 16px; line-height: 1.6;">
        Congratulations! You've claimed your spot among the founding members of avnz.io. As a Founder, you'll get exclusive early access to our platform and special benefits.
      </p>

      <!-- Referral Section -->
      <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="color: #18181b; margin: 0 0 12px; font-size: 18px; font-weight: 600;">🚀 Move Up the List</h3>
        <p style="color: #52525b; margin: 0 0 16px; font-size: 14px; line-height: 1.5;">
          Share your referral link and climb the ranks! Each friend who joins moves you up <strong>10 positions</strong>.
        </p>

        <div style="background: white; border: 2px dashed #d4d4d8; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;">
          <p style="color: #71717a; margin: 0 0 4px; font-size: 12px;">Your Referral Code</p>
          <p style="color: #18181b; margin: 0; font-size: 18px; font-weight: 600; font-family: monospace;">${referralCode}</p>
        </div>

        <a href="${referralLink}" style="display: block; background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%); color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: 600; text-align: center; font-size: 16px;">
          Share Your Link →
        </a>
      </div>

      <!-- What's Next -->
      <div style="border-top: 1px solid #e4e4e7; padding-top: 24px;">
        <h3 style="color: #18181b; margin: 0 0 16px; font-size: 16px; font-weight: 600;">What's Next?</h3>
        <ul style="color: #52525b; margin: 0; padding: 0 0 0 20px; font-size: 14px; line-height: 1.8;">
          <li>Keep an eye on your inbox for exclusive updates</li>
          <li>Share your referral link to improve your position</li>
          <li>Get ready for early access to the platform</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 24px 0;">
      <p style="color: #71717a; margin: 0 0 8px; font-size: 14px;">
        Questions? Reply to this email or visit <a href="https://founders.avnz.io/contact" style="color: #6366f1;">our contact page</a>.
      </p>
      <p style="color: #a1a1aa; margin: 0; font-size: 12px;">
        © ${new Date().getFullYear()} Avanzado Technologies LLC. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function getWelcomeEmailText(data: WelcomeEmailData): string {
  const { founderNumber, referralCode, referralLink, position } = data;

  return `
Welcome to avnz.io, Founder ${founderNumber}!

You've officially claimed your spot as Founder #${position.toLocaleString()}.

YOUR FOUNDER NUMBER: ${founderNumber}
YOUR REFERRAL CODE: ${referralCode}

🚀 MOVE UP THE LIST
Share your referral link and climb the ranks! Each friend who joins moves you up 10 positions.

Your referral link: ${referralLink}

WHAT'S NEXT?
- Keep an eye on your inbox for exclusive updates
- Share your referral link to improve your position
- Get ready for early access to the platform

Questions? Visit https://founders.avnz.io/contact

© ${new Date().getFullYear()} Avanzado Technologies LLC. All rights reserved.
  `.trim();
}

function getVerificationEmailHtml(data: VerificationEmailData & { verificationLink: string }): string {
  const { founderNumber, verificationLink } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 16px; padding: 40px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%); border-radius: 16px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 32px; font-weight: bold;">A</span>
        </div>
        <h1 style="color: #18181b; margin: 0 0 8px; font-size: 24px; font-weight: 700;">Verify Your Email</h1>
        <p style="color: #71717a; margin: 0; font-size: 16px;">Founder ${founderNumber}</p>
      </div>

      <p style="color: #3f3f46; margin: 0 0 24px; font-size: 16px; line-height: 1.6; text-align: center;">
        Click the button below to verify your email address and secure your founder status.
      </p>

      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${verificationLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Verify Email Address
        </a>
      </div>

      <p style="color: #a1a1aa; margin: 0; font-size: 12px; text-align: center;">
        This link expires in 24 hours. If you didn't sign up for avnz.io, you can ignore this email.
      </p>
    </div>

    <div style="text-align: center; padding: 24px 0;">
      <p style="color: #a1a1aa; margin: 0; font-size: 12px;">
        © ${new Date().getFullYear()} Avanzado Technologies LLC. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function getVerificationEmailText(data: VerificationEmailData & { verificationLink: string }): string {
  const { founderNumber, verificationLink } = data;

  return `
Verify Your Email - Founder ${founderNumber}

Click the link below to verify your email address and secure your founder status:

${verificationLink}

This link expires in 24 hours.

If you didn't sign up for avnz.io, you can ignore this email.

© ${new Date().getFullYear()} Avanzado Technologies LLC. All rights reserved.
  `.trim();
}
