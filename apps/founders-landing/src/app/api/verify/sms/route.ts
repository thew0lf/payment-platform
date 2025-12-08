import { NextRequest, NextResponse } from 'next/server';
import { getFounderByNumber, createVerificationToken } from '@/lib/db';
import { sendVerificationSMS, generateSMSCode, isTwilioConfigured } from '@/lib/sms';

// Store SMS codes in memory (in production, use Redis or DB)
const smsCodeStore = new Map<string, { code: string; expires: number; founderId: number }>();

// Request SMS verification code
export async function POST(request: NextRequest) {
  try {
    if (!isTwilioConfigured()) {
      return NextResponse.json(
        { success: false, message: 'SMS verification is not available' },
        { status: 503 }
      );
    }

    const { founderNumber, phone } = await request.json();

    if (!founderNumber || !phone) {
      return NextResponse.json(
        { success: false, message: 'Founder number and phone are required' },
        { status: 400 }
      );
    }

    const founder = await getFounderByNumber(founderNumber);
    if (!founder) {
      return NextResponse.json(
        { success: false, message: 'Founder not found' },
        { status: 404 }
      );
    }

    if (founder.phoneVerified) {
      return NextResponse.json(
        { success: false, message: 'Phone already verified' },
        { status: 400 }
      );
    }

    // Generate and store code
    const code = generateSMSCode();
    smsCodeStore.set(founderNumber, {
      code,
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes
      founderId: founder.id,
    });

    // Send SMS
    const sent = await sendVerificationSMS({
      phone,
      founderNumber: founder.founderNumber,
      verificationCode: code,
    });

    if (!sent) {
      return NextResponse.json(
        { success: false, message: 'Failed to send SMS. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('SMS verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// Verify SMS code
export async function PUT(request: NextRequest) {
  try {
    const { founderNumber, code } = await request.json();

    if (!founderNumber || !code) {
      return NextResponse.json(
        { success: false, message: 'Founder number and code are required' },
        { status: 400 }
      );
    }

    const stored = smsCodeStore.get(founderNumber);

    if (!stored) {
      return NextResponse.json(
        { success: false, message: 'No verification pending. Request a new code.' },
        { status: 400 }
      );
    }

    if (Date.now() > stored.expires) {
      smsCodeStore.delete(founderNumber);
      return NextResponse.json(
        { success: false, message: 'Code expired. Request a new one.' },
        { status: 400 }
      );
    }

    if (stored.code !== code) {
      return NextResponse.json(
        { success: false, message: 'Invalid code' },
        { status: 400 }
      );
    }

    // Create token and verify
    const token = await createVerificationToken(stored.founderId, 'phone');
    const { verifyToken } = await import('@/lib/db');
    await verifyToken(token, 'phone');

    // Clear the code
    smsCodeStore.delete(founderNumber);

    return NextResponse.json({ success: true, message: 'Phone verified successfully' });
  } catch (error) {
    console.error('SMS verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
