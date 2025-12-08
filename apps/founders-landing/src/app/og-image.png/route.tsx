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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.15) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Glow effects */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '20%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
            borderRadius: '100%',
            filter: 'blur(60px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-10%',
            right: '20%',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
            borderRadius: '100%',
            filter: 'blur(60px)',
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100px',
            height: '100px',
            background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
            borderRadius: '24px',
            marginBottom: '32px',
            boxShadow: '0 20px 40px rgba(99, 102, 241, 0.4)',
          }}
        >
          <span
            style={{
              color: 'white',
              fontSize: '56px',
              fontWeight: 'bold',
            }}
          >
            A
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <span
            style={{
              color: 'white',
              fontSize: '64px',
              fontWeight: 'bold',
              letterSpacing: '-0.02em',
            }}
          >
            avnz
          </span>
          <span
            style={{
              color: '#6366f1',
              fontSize: '64px',
              fontWeight: 'bold',
              letterSpacing: '-0.02em',
            }}
          >
            .io
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 32px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
            borderRadius: '100px',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            marginBottom: '24px',
          }}
        >
          <span
            style={{
              color: '#a5b4fc',
              fontSize: '24px',
              fontWeight: '600',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Founders Program
          </span>
        </div>

        {/* Description */}
        <span
          style={{
            color: '#a1a1aa',
            fontSize: '28px',
            textAlign: 'center',
            maxWidth: '800px',
            lineHeight: 1.4,
          }}
        >
          Be among the first to shape the future of intelligent commerce
        </span>

        {/* CTA */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: '48px',
            padding: '16px 40px',
            background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(99, 102, 241, 0.4)',
          }}
        >
          <span
            style={{
              color: 'white',
              fontSize: '24px',
              fontWeight: '600',
            }}
          >
            Claim Your Founder Number →
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
