import { NextRequest, NextResponse } from 'next/server';
import { getFounderByNumber, getFounderCount } from '@/lib/db';
import type { PositionResponse } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const founderNumber = params.code;

    const founder = await getFounderByNumber(founderNumber);
    if (!founder) {
      return NextResponse.json(
        { error: 'Founder not found' },
        { status: 404 }
      );
    }

    const totalFounders = await getFounderCount();

    const response: PositionResponse = {
      founderNumber: founder.founderNumber,
      currentPosition: founder.currentPosition,
      totalFounders,
      referralCount: founder.referralCount,
      referralCode: founder.referralCode,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Position error:', error);
    return NextResponse.json(
      { error: 'Failed to get position' },
      { status: 500 }
    );
  }
}
