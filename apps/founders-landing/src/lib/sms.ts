import twilio from 'twilio';

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://founders.avnz.io';

interface SMSVerificationData {
  phone: string;
  founderNumber: string;
  verificationCode: string;
}

export async function sendVerificationSMS(data: SMSVerificationData): Promise<boolean> {
  if (!twilioClient || !TWILIO_PHONE) {
    console.error('Twilio not configured');
    return false;
  }

  const { phone, founderNumber, verificationCode } = data;

  try {
    await twilioClient.messages.create({
      body: `avnz.io Founder ${founderNumber}: Your verification code is ${verificationCode}. Valid for 10 minutes.`,
      from: TWILIO_PHONE,
      to: phone,
    });

    return true;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return false;
  }
}

// Generate a 6-digit verification code
export function generateSMSCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function isTwilioConfigured(): boolean {
  return !!twilioClient && !!TWILIO_PHONE;
}
