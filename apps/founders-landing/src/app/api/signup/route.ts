import { NextRequest, NextResponse } from 'next/server';
import { generateReferralLink } from '@/lib/utils';
import type { SignupRequest, SignupResponse } from '@/types';

export const dynamic = 'force-dynamic';

// Main API URL for waitlist
const API_URL = process.env.MAIN_API_URL || 'http://localhost:3001';
const ORGANIZATION_ID = process.env.ORGANIZATION_ID || '';

// Offset for display (keeps founder numbers consistent with legacy system)
const FOUNDER_OFFSET = 832;

export async function POST(request: NextRequest) {
  try {
    const body: SignupRequest = await request.json();

    // Validate email
    if (!body.email || !body.email.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Call main API's waitlist signup endpoint
    const apiResponse = await fetch(`${API_URL}/api/waitlist/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: ORGANIZATION_ID,
        email: body.email,
        phone: body.phone,
        referralCode: body.referralCode,
        source: body.metadata?.utm_source,
        medium: body.metadata?.utm_medium,
        campaign: body.metadata?.utm_campaign,
        variant: body.metadata?.variant,
      }),
    });

    const apiData = await apiResponse.json();

    if (!apiResponse.ok) {
      // Handle duplicate email or other errors from main API
      const message = apiData.message || 'This email is already on the waitlist';
      return NextResponse.json(
        { success: false, message },
        { status: apiResponse.status }
      );
    }

    // Map API response to SignupResponse format
    const referralLink = generateReferralLink(apiData.referralCode);

    // Calculate display position with offset for consistency
    const displayPosition = apiData.currentPosition + FOUNDER_OFFSET;

    const response: SignupResponse = {
      success: true,
      founder: {
        founderNumber: apiData.founderNumber,
        referralCode: apiData.referralCode,
        position: displayPosition,
        totalFounders: displayPosition, // Approximate total (position is sequential)
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
