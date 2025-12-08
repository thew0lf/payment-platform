import { NextRequest, NextResponse } from 'next/server';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  } : undefined,
});

const CONTACT_EMAIL = 'hello@avnz.io';

// Simple in-memory rate limiting (resets on deploy)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 3; // Max submissions per window
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in ms

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return false;
  }

  if (record.count >= RATE_LIMIT) {
    return true;
  }

  record.count++;
  return false;
}

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  website?: string; // Honeypot field - should be empty
  formStartTime?: number; // Bot detection - form filled too fast
}

const subjectLabels: Record<string, string> = {
  general: 'General Inquiry',
  founders: 'Founders Program',
  partnership: 'Partnership',
  press: 'Press & Media',
  support: 'Support',
};

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Check rate limit
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body: ContactFormData = await request.json();
    const { name, email, subject, message, website, formStartTime } = body;

    // Honeypot check - if filled, silently reject (bot filled hidden field)
    if (website) {
      // Return success to not alert the bot
      return NextResponse.json({ success: true });
    }

    // Time-based bot detection - form submitted too fast (< 3 seconds)
    if (formStartTime && Date.now() - formStartTime < 3000) {
      return NextResponse.json({ success: true }); // Silent reject
    }

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Basic content validation
    if (name.length > 100 || email.length > 254 || message.length > 5000) {
      return NextResponse.json(
        { error: 'Input exceeds maximum length' },
        { status: 400 }
      );
    }

    const subjectLabel = subjectLabels[subject] || 'General Inquiry';

    // Send email via SES
    const command = new SendEmailCommand({
      Source: CONTACT_EMAIL,
      Destination: {
        ToAddresses: [CONTACT_EMAIL],
      },
      ReplyToAddresses: [email],
      Message: {
        Subject: {
          Data: `[avnz.io Contact] ${subjectLabel} from ${name}`,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #6366f1, #3b82f6); padding: 24px; border-radius: 12px 12px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
                </div>
                <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; width: 120px;">From:</td>
                      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Email:</td>
                      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827;"><a href="mailto:${email}" style="color: #6366f1;">${email}</a></td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Subject:</td>
                      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${subjectLabel}</td>
                    </tr>
                  </table>
                  <div style="margin-top: 24px;">
                    <h3 style="color: #374151; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Message</h3>
                    <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; color: #111827; line-height: 1.6;">
                      ${message.replace(/\n/g, '<br>')}
                    </div>
                  </div>
                  <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
                    Sent from avnz.io contact form
                  </div>
                </div>
              </div>
            `,
            Charset: 'UTF-8',
          },
          Text: {
            Data: `
New Contact Form Submission
===========================

From: ${name}
Email: ${email}
Subject: ${subjectLabel}

Message:
${message}

---
Sent from avnz.io contact form
            `.trim(),
            Charset: 'UTF-8',
          },
        },
      },
    });

    await ses.send(command);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again later.' },
      { status: 500 }
    );
  }
}
