# ACP Co-Creation Editor

Real-time collaborative editor with AI agent support using Azure Web PubSub and Agent Client Protocol (ACP).

## Architecture

This is a multi-client, Google-Docs-style co-creation editor that enables real-time collaboration through:

- **Azure Web PubSub** for managed WebSocket fan-out and real-time messaging
- **Agent Client Protocol (ACP)** for agent↔client conversation model
- **Mini LLM container** (Ollama/llama.cpp) for cost-efficient AI inference
- **Local-first development** mode for testing without Azure deployment

## Project Structure

```
acp-editor-demo/
├── packages/
│   ├── client/          # Browser UI (HTML/JS)
│   ├── agent-bridge/    # ACP relay + WebSocket integration
│   ├── token-broker/    # JWT token service for Web PubSub
│   ├── mini-llm/        # LLM container configuration
│   ├── shared/          # Shared message contracts
│   ├── tools/           # Local WebSocket broker & dev tools
│   └── infra/           # Azure infrastructure (Bicep/Terraform)
├── docker-compose.yml   # Local development orchestration
└── README.md
```

## Quick Start (Local Development)

### Prerequisites

- Node.js >= 18.0.0
- Docker and Docker Compose
- npm >= 9.0.0

### Installation

```bash
# Install dependencies
npm install

# Start all services locally
docker-compose up
```

This starts:
- **Local WebSocket Broker** on `ws://localhost:8080`
- **Agent Bridge** connecting to broker and LLM
- **Mini LLM (Ollama)** on `http://localhost:11434`
- **Client Web Server** on `http://localhost:3000`

### Usage

1. Open your browser to `http://localhost:3000/?thread=test123`
2. Open another browser tab with the same URL to see real-time collaboration
3. Type a message and press Enter
4. See both clients receive synchronized updates

### Running Without Docker

```bash
# Terminal 1: Start local WebSocket broker
cd packages/tools
npm install
npm run broker

# Terminal 2: Start agent bridge
cd packages/agent-bridge
npm install
npm start

# Terminal 3: Start client server
cd packages/client
npm install
npm run dev

# Terminal 4 (optional): Start Ollama separately
docker run -d -p 11434:11434 ollama/ollama
```

## Testing

```bash
# Run all tests
npm test

# Run tests for specific package
npm test -w packages/shared
npm test -w packages/agent-bridge
```

## Message Contract

All messages follow this JSON envelope structure:

### Client → Agent
```json
{
  "type": "join",
  "threadId": "abc123"
}

{
  "type": "loadSession",
  "threadId": "abc123"
}

{
  "type": "queuePrompt",
  "threadId": "abc123",
  "contentBlocks": [
    { "type": "text", "text": "Hello" }
  ]
}
```

### Agent → Clients
```json
{
  "type": "session_update",
  "threadId": "abc123",
  "chunk": {
    "role": "assistant",
    "content": [{ "type": "text", "text": "Response" }],
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Development Roadmap

### ✅ Phase 0: Repository & Project Scaffolding
- [x] Create monorepo structure
- [x] Define shared message contract
- [x] Add dev tooling (ESLint, Prettier)
- [x] Create base configuration

### 🚧 Phase 1: Local-First Bring-Up (In Progress)
- [x] Local WebSocket broker (Node.js ws)
- [x] ACP agent bridge (basic implementation)
- [x] Browser client MVP
- [ ] Ollama integration
- [ ] Docker Compose orchestration
- [ ] Integration tests

### 📋 Phase 2: Azure Real-Time Backbone
- [ ] Azure Web PubSub infrastructure
- [ ] Token broker service
- [ ] Update client for Web PubSub
- [ ] Remote testing

### 📋 Phase 3: Containerize & Deploy
- [ ] Dockerfiles for all services
- [ ] Azure Container Apps (ACA) infrastructure
- [ ] Scale-to-zero configuration
- [ ] Deployment documentation

### 📋 Phase 4: Persistence & Replay
- [ ] Session storage implementation
- [ ] session/load replay functionality
- [ ] Deterministic replay testing

### 📋 Phase 5: Testing & Quality
- [ ] Unit tests for agent-bridge
- [ ] Integration tests (local)
- [ ] Cloud smoke tests
- [ ] Performance testing

### 📋 Phase 6: Security & Cost Controls
- [ ] Web PubSub token scoping
- [ ] Network security boundaries
- [ ] Cost optimization documentation

### 📋 Phase 7: CI/CD
- [ ] GitHub Actions workflows
- [ ] Automated testing
- [ ] Deployment automation

## Contributing

This is an MVP implementation following the ACP specification. Contributions welcome!

## License

MIT

## References

- [Azure Web PubSub Documentation](https://learn.microsoft.com/en-us/azure/azure-web-pubsub/)
- [Agent Client Protocol (ACP)](https://spec.modelcontextprotocol.io/)
- [Ollama Docker Guide](https://docs.ollama.com/docker/)
- [Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/)