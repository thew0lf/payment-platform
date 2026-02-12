import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Fast response for health check probes (ECS task definition + ALB)
  // wget --spider sends a HEAD-like request to /
  // This avoids rendering the full page for health checks
  if (request.method === 'HEAD') {
    return new NextResponse(null, { status: 200 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/',
};
