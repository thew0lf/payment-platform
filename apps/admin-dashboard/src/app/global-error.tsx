'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#09090b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontSize: '3.75rem',
              fontWeight: 'bold',
              color: '#e4e4e7',
              marginBottom: '1rem'
            }}>500</h1>
            <h2 style={{
              fontSize: '1.25rem',
              color: '#a1a1aa',
              marginBottom: '1.5rem'
            }}>Something went wrong</h2>
            <button
              onClick={() => reset()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#06b6d4',
                color: 'white',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
