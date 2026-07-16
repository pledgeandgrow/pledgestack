export default function Loading() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '20px',
          height: '20px',
          border: '3px solid #e0e0e0',
          borderTopColor: '#0070f3',
          borderRadius: '50%',
          animation: 'pledge-spin 0.8s linear infinite',
        }} />
        <span style={{ color: '#666' }}>Loading...</span>
      </div>
      <style>{`@keyframes pledge-spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
