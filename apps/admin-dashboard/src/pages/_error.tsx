import { NextPageContext } from 'next';

interface Props {
  statusCode?: number;
}

function Error({ statusCode }: Props) {
  return (
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
        }}>{statusCode || 'Error'}</h1>
        <p style={{
          fontSize: '1.25rem',
          color: '#a1a1aa',
          marginBottom: '1.5rem'
        }}>
          {statusCode === 404
            ? 'Page not found'
            : 'An error occurred'}
        </p>
        <a
          href="/"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#06b6d4',
            color: 'white',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            display: 'inline-block'
          }}
        >
          Go Home
        </a>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
