import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getFounderById } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/verify?error=missing_token', request.url));
    }

    const result = await verifyToken(token, 'email');

    if (!result.success) {
      return NextResponse.redirect(
        new URL(`/verify?error=${encodeURIComponent(result.error || 'verification_failed')}`, request.url)
      );
    }

    // Get founder info for the success page
    const founder = result.founderId ? await getFounderById(result.founderId) : null;
    const founderNumber = founder?.founderNumber || '';

    return NextResponse.redirect(
      new URL(`/verify?success=true&founder=${founderNumber}`, request.url)
    );
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(new URL('/verify?error=server_error', request.url));
  }
}
