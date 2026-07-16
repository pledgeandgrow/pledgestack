# @pledgestack/ws

WebSocket support for PledgeStack — real-time routes with pub/sub.

## Usage

```typescript
// app/ws/chat/route.ts
import { defineWebSocketRoute } from '@pledgestack/ws';

export default defineWebSocketRoute({
  onOpen(ws) {
    ws.send('Welcome to the chat!');
    ws.broadcast(`User ${ws.id} joined`, true);
  },
  onMessage(ws, data) {
    if (data.type === 'text') {
      ws.broadcast(data.data as string, true);
    }
  },
  onClose(ws) {
    ws.broadcast(`User ${ws.id} left`, true);
  },
});
```

## API

- `defineWebSocketRoute(handler)` — Define a WebSocket route handler
- `websocketPlugin()` — Pledgepack plugin for WebSocket route handling
- `WSRoom` — Room manager for connected clients with pub/sub topics
- `PledgeWebSocket` — WebSocket connection interface with broadcast/publish
