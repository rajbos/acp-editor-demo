/**
 * Token Broker - Placeholder for Phase 2
 *
 * This service will issue Azure Web PubSub client access tokens.
 * For Phase 1 (local mode), this is not needed as we use the local broker directly.
 *
 * When implementing Phase 2:
 * 1. Use @azure/web-pubsub package
 * 2. Create HTTP endpoint (e.g., GET /api/token?threadId=xyz)
 * 3. Generate client access token with appropriate permissions
 * 4. Return { url, token } to client
 */

import { createServer } from 'http';

const PORT = process.env.PORT || 4000;

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      message: 'Token broker - Phase 2 implementation pending',
      note: 'For Phase 1, use local broker directly (ws://localhost:8080)',
    })
  );
});

server.listen(PORT, () => {
  console.log(`🔐 Token Broker placeholder running on port ${PORT}`);
  console.log('Phase 2: Will issue Azure Web PubSub client tokens');
});
