# Development Guide

## Quick Start

### 1. Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker and Docker Compose (optional, for containerized setup)
- Git

### 2. Clone and Install

```bash
git clone https://github.com/rajbos/acp-editor-demo.git
cd acp-editor-demo
npm install
```

### 3. Start Local Development

#### Option A: Using the Start Script (Recommended)

```bash
./start-local.sh
```

This starts all services (broker, agent-bridge, client) in one command.

#### Option B: Using Docker Compose

```bash
docker-compose up --build
```

#### Option C: Manual (Individual Terminals)

```bash
# Terminal 1: Local WebSocket Broker
cd packages/tools
npm install
npm run broker

# Terminal 2: Agent Bridge
cd packages/agent-bridge
npm install
npm start

# Terminal 3: Client Server
cd packages/client
npm install
npm run dev

# Terminal 4 (Optional): Start Ollama
docker run -d -p 11434:11434 ollama/ollama
docker exec -it ollama ollama pull llama3.2:1b
```

### 4. Open the Application

Open your browser to: `http://localhost:3000/?thread=test123`

To test collaboration, open the same URL in another browser tab or window.

## Development Workflow

### Making Changes

1. **Edit code** in any package
2. **Run tests**: `npm test`
3. **Lint code**: `npm run lint`
4. **Format code**: `npx prettier --write .`
5. **Commit changes**: Use conventional commit messages

### Package Structure

```
packages/
├── client/          # Browser UI (vanilla JS)
├── agent-bridge/    # ACP relay (Node.js)
├── token-broker/    # Auth service (Phase 2)
├── mini-llm/        # LLM docs and config
├── shared/          # Message contracts
├── tools/           # Local broker & dev tools
└── infra/           # Azure IaC (Phase 2/3)
```

### Testing

```bash
# Run all tests
npm test

# Run tests for specific package
npm test -w packages/shared

# Run tests with coverage
npm test -- --coverage

# Run integration tests
npm run test:integration
```

### Linting and Formatting

```bash
# Lint all packages
npm run lint

# Format all files
npx prettier --write "**/*.{js,json,md,yml}"

# Check formatting
npx prettier --check "**/*.{js,json,md,yml}"
```

## Architecture

### Message Flow

```
Browser Client
    ↓ (WebSocket)
Local Broker (mimics Azure Web PubSub)
    ↓ (group broadcast)
Agent Bridge (ACP implementation)
    ↓ (HTTP)
Mini LLM (Ollama/llama.cpp)
```

### Key Concepts

1. **Thread**: A collaboration session (identified by `threadId`)
2. **Group**: WebSocket group (one per thread)
3. **Session**: ACP session (stores conversation history)
4. **Chunk**: A message update (user message, assistant response, etc.)

### Message Types

- `join` - Client joins a thread
- `loadSession` - Request session history replay
- `queuePrompt` - Send a user message
- `session_update` - Broadcast message/response update

## Debugging

### Browser Developer Tools

1. Open DevTools (F12)
2. Check Console for WebSocket messages
3. Check Network tab for WebSocket connection
4. Use Application > Storage to inspect state

### Node.js Debugging

```bash
# Debug agent bridge
node --inspect-brk packages/agent-bridge/src/index.js

# Debug with Chrome DevTools
# Open chrome://inspect in Chrome
```

### Common Issues

#### WebSocket Connection Failed

- Ensure local broker is running on port 8080
- Check firewall settings
- Verify WebSocket URL in client (`ws://localhost:8080`)

#### Agent Not Responding

- Check agent-bridge logs for errors
- Verify broker connection
- Test LLM endpoint: `curl http://localhost:11434/api/tags`

#### Messages Not Syncing

- Check that both clients are in the same thread (same `threadId` in URL)
- Verify group join succeeded (check broker logs)
- Refresh the page to reconnect

## Performance

### Local Development

- **Broker**: Handles 100+ concurrent connections easily
- **Agent**: Processes messages in FIFO order
- **LLM**: Response time depends on model size and hardware

### Optimization Tips

1. Use small models for development (llama3.2:1b)
2. Enable response streaming for better UX
3. Implement message debouncing for high-frequency updates
4. Use connection pooling for LLM requests

## Security

### Local Mode (Phase 1)

- No authentication required
- WebSocket connections are unencrypted (ws://)
- Suitable for localhost development only

### Production Mode (Phase 2+)

- JWT tokens from token-broker
- TLS/SSL (wss://) for WebSocket connections
- Azure Managed Identity for service-to-service auth
- Network security groups for isolation

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and test thoroughly
3. Run linters and tests: `npm run lint && npm test`
4. Commit with conventional commits: `git commit -m "feat: add feature"`
5. Push and create a pull request

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process using port 8080
lsof -ti:8080 | xargs kill -9

# Or use different port
WS_PORT=8081 npm run broker
```

### Dependencies Not Installing

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Docker Issues

```bash
# Rebuild without cache
docker-compose build --no-cache

# Clean up Docker resources
docker-compose down -v
docker system prune -a
```

## Next Steps

- [ ] Phase 1: Integrate Ollama LLM with agent-bridge
- [ ] Phase 1: Add comprehensive integration tests
- [ ] Phase 2: Implement Azure Web PubSub integration
- [ ] Phase 2: Build token-broker service
- [ ] Phase 3: Deploy to Azure Container Apps

## Resources

- [Project README](../README.md)
- [Testing Guide](../TESTING.md)
- [Mini LLM Setup](packages/mini-llm/README.md)
- [Infrastructure Guide](packages/infra/README.md)
