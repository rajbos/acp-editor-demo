#!/usr/bin/env node
import WebSocket from 'ws';

const BROKER_URL = process.env.BROKER_URL || 'ws://localhost:8080';
const THREAD = process.env.THREAD || 'stream-test';

async function run() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(BROKER_URL);

    ws.on('open', () => {
      console.log('connected to broker');
      // join group
      ws.send(JSON.stringify({ action: 'joinGroup', group: THREAD }));

      // send ACP join via broker sendToGroup
      ws.send(
        JSON.stringify({ action: 'sendToGroup', group: THREAD, data: { type: 'join', threadId: THREAD, clientId: 'probe-1', displayName: 'Probe' } })
      );

      // request loadSession via broker
      ws.send(
        JSON.stringify({ action: 'sendToGroup', group: THREAD, data: { type: 'loadSession', threadId: THREAD, clientId: 'probe-1', displayName: 'Probe' } })
      );

      // wait a moment then send a prompt
      setTimeout(() => {
        const msg = {
          type: 'queuePrompt',
          threadId: THREAD,
          clientId: 'probe-1',
          displayName: 'Probe',
          contentBlocks: [{ type: 'text', text: 'Hello from probe — please respond.' }],
        };
        console.log('sending queuePrompt');
        ws.send(JSON.stringify({ action: 'sendToGroup', group: THREAD, data: msg }));
      }, 500);
    });

    ws.on('message', (data) => {
      try {
        const m = JSON.parse(data.toString());
        console.log('RECV:', JSON.stringify(m, null, 2));

        if (m.type === 'session_update' && m.chunk && m.chunk.role === 'assistant') {
          console.log('Received assistant final chunk — done');
          ws.close();
          resolve();
        }
      } catch (e) {
        console.error('parse error', e);
      }
    });

    ws.on('error', (err) => {
      reject(err);
    });

    setTimeout(() => reject(new Error('probe timeout')), 15000);
  });
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('probe failed', e.message);
    process.exit(1);
  });
