#!/usr/bin/env node
/**
 * Simple integration test for local broker
 * Tests that clients can join groups and send messages
 */

import WebSocket from 'ws';

const BROKER_URL = 'ws://localhost:8080';
const TEST_THREAD = 'test-integration-123';

console.log('🧪 Starting integration test...\n');

// Test 1: Client can connect
async function testConnection() {
  return new Promise((resolve, reject) => {
    console.log('Test 1: Client connection');
    const ws = new WebSocket(BROKER_URL);

    ws.on('open', () => {
      console.log('  ✅ Connected to broker');
      ws.close();
      resolve();
    });

    ws.on('error', (err) => {
      console.error('  ❌ Connection failed:', err.message);
      reject(err);
    });

    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
}

// Test 2: Client can join a group
async function testJoinGroup() {
  return new Promise((resolve, reject) => {
    console.log('\nTest 2: Join group');
    const ws = new WebSocket(BROKER_URL);

    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          action: 'joinGroup',
          group: TEST_THREAD,
        })
      );
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'joined' && message.group === TEST_THREAD) {
        console.log(`  ✅ Successfully joined group: ${TEST_THREAD}`);
        ws.close();
        resolve();
      }
    });

    ws.on('error', reject);
    setTimeout(() => reject(new Error('Join group timeout')), 5000);
  });
}

// Test 3: Multiple clients in same group receive broadcast
async function testGroupBroadcast() {
  return new Promise((resolve, reject) => {
    console.log('\nTest 3: Group broadcast');

    let client1Ready = false;
    let client2Ready = false;

    const client1 = new WebSocket(BROKER_URL);
    const client2 = new WebSocket(BROKER_URL);

    client1.on('open', () => {
      client1.send(JSON.stringify({ action: 'joinGroup', group: TEST_THREAD }));
    });

    client2.on('open', () => {
      client2.send(JSON.stringify({ action: 'joinGroup', group: TEST_THREAD }));
    });

    client1.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'joined') {
        client1Ready = true;
        if (client2Ready) {
          // Both joined, send test message
          client1.send(
            JSON.stringify({
              action: 'sendToGroup',
              group: TEST_THREAD,
              data: { type: 'test', message: 'Hello from client1' },
            })
          );
        }
      }
    });

    client2.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'joined') {
        client2Ready = true;
        if (client1Ready) {
          // Both joined, send test message
          client1.send(
            JSON.stringify({
              action: 'sendToGroup',
              group: TEST_THREAD,
              data: { type: 'test', message: 'Hello from client1' },
            })
          );
        }
      } else if (message.type === 'test') {
        console.log('  ✅ Client 2 received broadcast message');
        client1.close();
        client2.close();
        resolve();
      }
    });

    client1.on('error', reject);
    client2.on('error', reject);
    setTimeout(() => reject(new Error('Broadcast timeout')), 5000);
  });
}

// Run all tests
(async () => {
  try {
    await testConnection();
    await testJoinGroup();
    await testGroupBroadcast();

    console.log('\n✅ All integration tests passed!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
