# API Documentation

## Local WebSocket Broker API

The local broker mimics Azure Web PubSub semantics for development.

### Connection

```javascript
const ws = new WebSocket('ws://localhost:8080');
```

### Actions

#### Join Group

Join a WebSocket group (one per thread).

```json
{
  "action": "joinGroup",
  "group": "thread-id-123"
}
```

**Response:**
```json
{
  "type": "joined",
  "group": "thread-id-123"
}
```

#### Leave Group

Leave a WebSocket group.

```json
{
  "action": "leaveGroup",
  "group": "thread-id-123"
}
```

#### Send to Group

Broadcast a message to all members of a group.

```json
{
  "action": "sendToGroup",
  "group": "thread-id-123",
  "data": {
    "type": "session_update",
    "threadId": "thread-id-123",
    "chunk": { ... }
  }
}
```

**Notes:**
- All group members (including sender) receive the broadcast
- Messages are delivered in order
- Disconnected clients are automatically removed from groups

---

## ACP Message Protocol

### Client → Agent Messages

#### Join Message

Notify the agent that a client has joined a thread.

```json
{
  "type": "join",
  "threadId": "thread-id-123"
}
```

#### Load Session Message

Request replay of session history.

```json
{
  "type": "loadSession",
  "threadId": "thread-id-123"
}
```

**Expected Response:**
- Multiple `session_update` messages containing historical chunks
- Delivered in chronological order
- Ensures deterministic replay

#### Queue Prompt Message

Send a user message/prompt to the agent.

```json
{
  "type": "queuePrompt",
  "threadId": "thread-id-123",
  "contentBlocks": [
    {
      "type": "text",
      "text": "Hello, AI!"
    }
  ]
}
```

**Content Block Types:**
- `text` - Plain text content
- `tool_use` - Tool invocation (future)
- `tool_result` - Tool result (future)

### Agent → Client Messages

#### Session Update Message

Broadcast update to all clients in a thread.

```json
{
  "type": "session_update",
  "threadId": "thread-id-123",
  "chunk": {
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "Hello! How can I help you?"
      }
    ],
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

**Chunk Roles:**
- `user` - User message
- `assistant` - AI response
- `system` - System message
- `error` - Error message

**Chunk Structure:**
```typescript
interface Chunk {
  role: 'user' | 'assistant' | 'system' | 'error';
  content: ContentBlock[];
  timestamp: string; // ISO 8601
}
```

---

## Agent Bridge API

The agent bridge does not expose an HTTP API in local mode. It communicates solely through the WebSocket broker.

### Environment Variables

- `BROKER_URL` - WebSocket broker URL (default: `ws://localhost:8080`)
- `LLM_URL` - Mini LLM endpoint (default: `http://localhost:11434`)

### Session Management

Sessions are stored in-memory with the following structure:

```typescript
interface Session {
  threadId: string;
  history: Chunk[];
  createdAt: string;
}
```

**Operations:**
- `newSession(threadId)` - Create new session
- `loadSession(threadId)` - Load and replay existing session
- `addToHistory(threadId, chunk)` - Add message to history

---

## Mini LLM API (Ollama)

### Generate (Non-Streaming)

```bash
POST http://localhost:11434/api/generate
Content-Type: application/json

{
  "model": "llama3.2:1b",
  "prompt": "Hello, how are you?",
  "stream": false
}
```

**Response:**
```json
{
  "model": "llama3.2:1b",
  "created_at": "2024-01-01T00:00:00.000Z",
  "response": "I'm doing well, thank you!",
  "done": true
}
```

### Generate (Streaming)

```bash
POST http://localhost:11434/api/generate
Content-Type: application/json

{
  "model": "llama3.2:1b",
  "prompt": "Hello, how are you?",
  "stream": true
}
```

**Response:** Stream of JSON objects, one per line

```json
{"model":"llama3.2:1b","response":"I'm","done":false}
{"model":"llama3.2:1b","response":" doing","done":false}
{"model":"llama3.2:1b","response":" well","done":false}
{"model":"llama3.2:1b","response":"!","done":true}
```

### List Models

```bash
GET http://localhost:11434/api/tags
```

**Response:**
```json
{
  "models": [
    {
      "name": "llama3.2:1b",
      "modified_at": "2024-01-01T00:00:00.000Z",
      "size": 1300000000
    }
  ]
}
```

---

## Token Broker API (Phase 2)

**Note:** Not yet implemented. Placeholder for Azure Web PubSub token generation.

### Get Client Token

```bash
GET /api/token?threadId=thread-id-123
```

**Response:**
```json
{
  "url": "wss://your-pubsub.webpubsub.azure.com/client/hubs/your-hub",
  "accessToken": "eyJ...",
  "expiresAt": "2024-01-01T01:00:00.000Z"
}
```

---

## Browser Client JavaScript API

### ACPClient Class

```javascript
const client = new ACPClient();
await client.connect();
```

#### Methods

- `connect()` - Connect to broker
- `joinThread()` - Join current thread
- `sendPrompt(text)` - Send user message
- `sendToGroup(data)` - Send raw message to group

#### Events

Handled internally via WebSocket message handler:
- `joined` - Successfully joined group
- `session_update` - Received session update

#### Properties

- `threadId` - Current thread ID (from URL)
- `connected` - Connection status
- `transcript` - Array of session chunks

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Common Error Codes

- `GROUP_NOT_FOUND` - Attempted to send to non-existent group
- `SESSION_NOT_FOUND` - Thread/session does not exist
- `INVALID_MESSAGE` - Malformed message
- `LLM_ERROR` - LLM request failed

---

## Rate Limiting

**Local Mode:** No rate limiting

**Production (Phase 2+):**
- Per-connection: 10 messages/second
- Per-session: 100 messages/minute
- LLM requests: 1/second per session

---

## Security

### Local Mode (Phase 1)
- No authentication
- No encryption (ws://)
- Localhost only

### Production Mode (Phase 2+)
- JWT tokens from token broker
- TLS encryption (wss://)
- Token expiry and refresh
- Azure Managed Identity for services

---

## Examples

### Complete Client Flow

```javascript
// 1. Connect to broker
const ws = new WebSocket('ws://localhost:8080');

// 2. Join group
ws.send(JSON.stringify({
  action: 'joinGroup',
  group: 'my-thread-123'
}));

// 3. Join session (ACP message)
ws.send(JSON.stringify({
  action: 'sendToGroup',
  group: 'my-thread-123',
  data: {
    type: 'join',
    threadId: 'my-thread-123'
  }
}));

// 4. Load history
ws.send(JSON.stringify({
  action: 'sendToGroup',
  group: 'my-thread-123',
  data: {
    type: 'loadSession',
    threadId: 'my-thread-123'
  }
}));

// 5. Send prompt
ws.send(JSON.stringify({
  action: 'sendToGroup',
  group: 'my-thread-123',
  data: {
    type: 'queuePrompt',
    threadId: 'my-thread-123',
    contentBlocks: [
      { type: 'text', text: 'Hello!' }
    ]
  }
}));

// 6. Receive updates
ws.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.type === 'session_update') {
    console.log('Received:', message.chunk);
  }
});
```

---

## References

- [Azure Web PubSub API](https://learn.microsoft.com/azure/azure-web-pubsub/reference-server-sdk-js)
- [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Agent Client Protocol](https://spec.modelcontextprotocol.io/)
