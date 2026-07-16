import type { HeadMetadata } from 'pledgestack';

export function generateMetadata(): HeadMetadata {
  return {
    title: 'PledgeStack — Home',
    description: 'A full-stack React framework with file-based routing, SSR, SSG, RSC, and more.',
    openGraph: {
      title: 'PledgeStack Playground',
      description: 'A full-stack React framework',
      type: 'website',
    },
  };
}

export default function HomePage() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Welcome to PledgeStack</h1>
      <p style={{ color: '#666', fontSize: '1.1rem' }}>
        A full-stack React framework with file-based routing, SSR, SSG, RSC, API routes, middleware, and edge runtime.
      </p>
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <a href="/about" style={{ color: '#0070f3', textDecoration: 'none' }}>About →</a>
        <a href="/api/hello" style={{ color: '#0070f3', textDecoration: 'none' }}>API Example →</a>
      </div>
    </main>
  );
}
