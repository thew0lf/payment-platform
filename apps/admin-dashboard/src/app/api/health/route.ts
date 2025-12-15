import { NextResponse } from 'next/server';

/**
 * Health check endpoint for ECS/ALB health checks
 * Returns 200 OK with basic status info
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'admin-dashboard',
    },
    { status: 200 }
  );
}
