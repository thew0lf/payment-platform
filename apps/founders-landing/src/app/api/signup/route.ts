import { NextRequest, NextResponse } from 'next/server';
import { createFounder, getFounderByEmail, getFounderByReferralCode, processReferral, getFounderCount, initDatabase, createVerificationToken } from '@/lib/db';
import { generateReferralLink } from '@/lib/utils';
import { sendWelcomeEmail, sendVerificationEmail } from '@/lib/email';
import type { SignupRequest, SignupResponse } from '@/types';

// Initialize database on first request
let dbInitialized = false;

export async function POST(request: NextRequest) {
  try {
    // Initialize database if needed
    if (!dbInitialized) {
      try {
        await initDatabase();
        dbInitialized = true;
      } catch (error) {
        console.error('Database initialization error:', error);
        // Continue anyway - tables might already exist
      }
    }

    const body: SignupRequest = await request.json();

    // Validate email
    if (!body.email || !body.email.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingFounder = await getFounderByEmail(body.email);
    if (existingFounder) {
      return NextResponse.json(
        { success: false, message: 'This email is already registered' },
        { status: 400 }
      );
    }

    // Validate referral code if provided
    let referredBy: string | undefined;
    if (body.referralCode) {
      const referrer = await getFounderByReferralCode(body.referralCode);
      if (referrer) {
        referredBy = body.referralCode;
      }
    }

    // Create new founder
    const founder = await createFounder({
      email: body.email,
      phone: body.phone,
      referredBy,
      metadata: body.metadata,
    });

    // Process referral if applicable
    if (referredBy) {
      await processReferral(referredBy, founder.id);
    }

    // Get total count for response
    const totalFounders = await getFounderCount();

    const referralLink = generateReferralLink(founder.referralCode);

    // Send welcome email (non-blocking)
    sendWelcomeEmail({
      email: founder.email,
      founderNumber: founder.founderNumber,
      referralCode: founder.referralCode,
      referralLink,
      position: founder.currentPosition,
    }).catch((err) => console.error('Welcome email error:', err));

    // Create and send verification email (non-blocking)
    createVerificationToken(founder.id, 'email')
      .then((token) => {
        sendVerificationEmail({
          email: founder.email,
          founderNumber: founder.founderNumber,
          verificationToken: token,
        }).catch((err) => console.error('Verification email error:', err));
      })
      .catch((err) => console.error('Token creation error:', err));

    const response: SignupResponse = {
      success: true,
      founder: {
        founderNumber: founder.founderNumber,
        referralCode: founder.referralCode,
        position: founder.currentPosition,
        totalFounders,
      },
      referralLink,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, message: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
