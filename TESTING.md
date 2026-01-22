# Testing Guide

## Overview

This project includes multiple levels of testing:
1. Unit tests for message validation
2. Integration tests for local components
3. Docker Compose smoke tests

## Running Tests

### Unit Tests

```bash
# Run all tests
npm test

# Run tests for specific package
npm test -w packages/shared
```

### Integration Tests (Local Mode)

To test the full system locally without Docker:

```bash
# Terminal 1: Start local broker
cd packages/tools
npm install
npm run broker

# Terminal 2: Start agent bridge
cd packages/agent-bridge
npm install
npm start

# Terminal 3: Start client
cd packages/client
npm install
npm run dev

# Terminal 4: Run manual tests
# Open http://localhost:3000/?thread=test123 in two browser tabs
# Send messages and verify:
# - Both tabs receive messages in real-time
# - Messages persist when refreshing the page
# - Session history is replayed when joining
```

### Docker Compose Tests

```bash
# Build and start all services
docker-compose up --build

# In another terminal, run smoke tests
npm run test:integration

# Clean up
docker-compose down
```

## Test Structure

```
packages/
├── shared/
│   └── src/
│       └── index.test.js       # Message validation tests
├── agent-bridge/
│   └── src/
│       └── index.test.js       # Agent logic tests (TODO)
└── tools/
    └── test/
        └── integration.test.js # Integration tests (TODO)
```

## Writing Tests

### Unit Tests

Use Node.js built-in test runner:

```javascript
import { test } from 'node:test';
import assert from 'node:assert';

test('my test', () => {
  assert.strictEqual(1 + 1, 2);
});
```

### Integration Tests

For integration tests, use the test runner with async:

```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import WebSocket from 'ws';

test('client can join and send messages', async (t) => {
  const ws = new WebSocket('ws://localhost:8080');
  
  await new Promise((resolve) => {
    ws.on('open', resolve);
  });
  
  ws.send(JSON.stringify({
    action: 'joinGroup',
    group: 'test'
  }));
  
  // Add assertions...
  
  ws.close();
});
```

## CI/CD Tests

GitHub Actions runs tests on every push:

- **lint.yml**: Runs ESLint and Prettier
- **test.yml**: Runs unit tests on Node 18 and 20
- **build.yml**: Builds all Docker images

## Test Coverage

Current test coverage:
- ✅ Message validation (shared package)
- ⏳ Agent bridge logic (TODO)
- ⏳ Integration tests (TODO)
- ⏳ E2E tests (TODO)

## Debugging Tests

```bash
# Run tests with verbose output
node --test --test-reporter=spec

# Run specific test file
node --test src/index.test.js

# Debug with Node inspector
node --test --inspect-brk src/index.test.js
```
