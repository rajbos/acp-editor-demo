/**
 * Local WebSocket Broker - Development Mode
 * Mimics Azure Web PubSub semantics (groups) for local testing
 */

import { WebSocketServer } from 'ws';

const PORT = process.env.WS_PORT || 8080;
const groups = new Map(); // groupId -> Set of WebSocket clients

const server = new WebSocketServer({ port: PORT });

console.log(`🚀 Local WebSocket Broker listening on ws://localhost:${PORT}`);
console.log('Mimicking Azure Web PubSub group semantics for local development');

server.on('connection', (ws) => {
  console.log('✅ New client connected');
  const clientGroups = new Set();

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Received:', message);

      // Handle group join
      if (message.action === 'joinGroup') {
        const { group } = message;
        if (!group) {
          ws.send(JSON.stringify({ error: 'Group name required' }));
          return;
        }

        // Add client to group
        if (!groups.has(group)) {
          groups.set(group, new Set());
        }
        groups.get(group).add(ws);
        clientGroups.add(group);

        console.log(`👥 Client joined group: ${group} (${groups.get(group).size} members)`);
        ws.send(JSON.stringify({ type: 'joined', group }));
        return;
      }

      // Handle group leave
      if (message.action === 'leaveGroup') {
        const { group } = message;
        if (groups.has(group)) {
          groups.get(group).delete(ws);
          clientGroups.delete(group);
          console.log(`👋 Client left group: ${group}`);
        }
        return;
      }

      // Handle group broadcast
      if (message.action === 'sendToGroup') {
        const { group, data: payload } = message;
        if (!groups.has(group)) {
          ws.send(JSON.stringify({ error: `Group ${group} not found` }));
          return;
        }

        // Broadcast to all members of the group
        const groupMembers = groups.get(group);
        console.log(`📢 Broadcasting to group ${group} (${groupMembers.size} members)`);

        groupMembers.forEach((client) => {
          if (client.readyState === 1) {
            // OPEN
            client.send(JSON.stringify(payload));
          }
        });
        return;
      }

      // Unknown action
      ws.send(JSON.stringify({ error: 'Unknown action', received: message }));
    } catch (error) {
      console.error('❌ Error processing message:', error);
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    console.log('👋 Client disconnected');
    // Remove client from all groups
    clientGroups.forEach((group) => {
      if (groups.has(group)) {
        groups.get(group).delete(ws);
        console.log(`🧹 Cleaned up client from group: ${group}`);
      }
    });
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down local broker...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
