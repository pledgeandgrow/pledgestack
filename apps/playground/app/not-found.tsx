export default function NotFound() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', color: '#0070f3', marginBottom: '0.5rem' }}>404</h1>
      <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
        This page could not be found.
      </p>
      <a href="/" style={{ color: '#0070f3', textDecoration: 'none' }}>
        Return home →
      </a>
    </main>
  );
}
