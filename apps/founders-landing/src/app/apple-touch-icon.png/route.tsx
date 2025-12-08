import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
          borderRadius: '22%',
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize: '120px',
            fontWeight: 'bold',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          A
        </span>
      </div>
    ),
    {
      width: 180,
      height: 180,
    }
  );
}
