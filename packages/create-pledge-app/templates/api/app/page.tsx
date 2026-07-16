export default function HomePage() {
  return (
    <div>
      <h1>API Server</h1>
      <p>Endpoints:</p>
      <ul>
        <li><code>GET /api/items</code></li>
        <li><code>POST /api/items</code></li>
        <li><code>GET /api/items/:id</code></li>
      </ul>
    </div>
  );
}
