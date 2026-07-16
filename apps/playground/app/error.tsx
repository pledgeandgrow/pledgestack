interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{
        padding: '1.5rem',
        borderRadius: '8px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
      }}>
        <h2 style={{ color: '#dc2626', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
          Something went wrong
        </h2>
        <p style={{ color: '#991b1b', fontSize: '0.9rem', marginBottom: '1rem' }}>
          {error.message}
        </p>
        <button
          onClick={reset}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Try again
        </button>
      </div>
    </main>
  );
}
