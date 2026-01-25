/**
 * ACP Agent Bridge - Local Mode
 * Connects to local WebSocket broker and implements ACP session lifecycle
 */

import WebSocket from 'ws';
import { MessageType } from '../../shared/src/index.js';

const BROKER_URL = process.env.BROKER_URL || 'ws://localhost:8080';
const LLM_URL = process.env.LLM_URL || 'http://localhost:11434';

// In-memory session store (for MVP)
const sessions = new Map();

class AgentBridge {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`🔌 Connecting to broker at ${BROKER_URL}...`);
      this.ws = new WebSocket(BROKER_URL);

      this.ws.on('open', () => {
        console.log('✅ Connected to local WebSocket broker');
        this.connected = true;
        this.reconnectAttempts = 0;

        // Join as a server-side participant (agent)
        this.ws.send(
          JSON.stringify({
            action: 'joinGroup',
            group: 'agent-bridge',
          })
        );

        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('close', () => {
        console.log('❌ Disconnected from broker');
        this.connected = false;
        this.reconnect();
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        reject(error);
      });
    });
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  async handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Agent received:', message);

      switch (message.type) {
        case MessageType.JOIN:
          await this.handleJoin(message);
          break;
        case MessageType.LOAD_SESSION:
          await this.handleLoadSession(message);
          break;
        case MessageType.QUEUE_PROMPT:
          await this.handleQueuePrompt(message);
          break;
        case 'joined':
          console.log(`✅ Successfully joined group: ${message.group}`);
          break;
        default:
          console.log('⚠️  Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
    }
  }

  async handleJoin(message) {
    const { threadId } = message;
    console.log(`👥 Client joining thread: ${threadId}`);

    // Initialize session if needed
    if (!sessions.has(threadId)) {
      sessions.set(threadId, {
        threadId,
        history: [],
        createdAt: new Date().toISOString(),
      });
      console.log(`📝 Created new session: ${threadId}`);
    }

    // Broadcast join acknowledgment
    this.broadcastToGroup(threadId, {
      type: 'joined',
      threadId,
    });
  }

  async handleLoadSession(message) {
    const { threadId } = message;
    console.log(`📂 Loading session: ${threadId}`);

    const session = sessions.get(threadId);
    if (!session) {
      console.log(`⚠️  Session not found: ${threadId}, creating new one`);
      sessions.set(threadId, {
        threadId,
        history: [],
        createdAt: new Date().toISOString(),
      });
      return;
    }

    // Replay session history as session_update chunks
    console.log(`🔄 Replaying ${session.history.length} history items`);
    for (const chunk of session.history) {
      this.broadcastToGroup(threadId, {
        type: MessageType.SESSION_UPDATE,
        threadId,
        chunk,
      });
    }

    console.log(`✅ Session replay complete for ${threadId}`);
  }

  async handleQueuePrompt(message) {
    const { threadId, contentBlocks } = message;
    console.log(`💬 Processing prompt for thread: ${threadId}`);

    const session = sessions.get(threadId);
    if (!session) {
      console.error(`❌ Session not found: ${threadId}`);
      return;
    }

    // Add user message to history (preserve sender metadata)
    const userChunk = {
      role: 'user',
      content: contentBlocks,
      timestamp: new Date().toISOString(),
      clientId: message.clientId,
      displayName: message.displayName,
    };
    session.history.push(userChunk);

    // Broadcast user message
    this.broadcastToGroup(threadId, {
      type: MessageType.SESSION_UPDATE,
      threadId,
      chunk: userChunk,
    });

    // Call mini LLM (simplified for MVP)
    try {
      const response = await this.callLLM(contentBlocks);

      // Add assistant response to history
      const assistantChunk = {
        role: 'assistant',
        content: [{ type: 'text', text: response }],
        timestamp: new Date().toISOString(),
      };
      session.history.push(assistantChunk);

      // Broadcast assistant response
      this.broadcastToGroup(threadId, {
        type: MessageType.SESSION_UPDATE,
        threadId,
        chunk: assistantChunk,
      });

      console.log(`✅ Prompt processed for thread: ${threadId}`);
    } catch (error) {
      console.error(`❌ Error calling LLM:`, error);

      // Broadcast error
      const errorChunk = {
        role: 'error',
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        timestamp: new Date().toISOString(),
      };

      this.broadcastToGroup(threadId, {
        type: MessageType.SESSION_UPDATE,
        threadId,
        chunk: errorChunk,
      });
    }
  }

  async callLLM(contentBlocks) {
    // For MVP: simple echo or mock response
    // In Phase 1, this will connect to Ollama
    const userText = contentBlocks.map((b) => b.text || '').join(' ');
    console.log(`🤖 LLM input: ${userText}`);

    // Mock response for now
    return `Echo: ${userText} (LLM not connected yet - this is a mock response)`;

    // TODO: Implement Ollama integration
    // const response = await fetch(`${LLM_URL}/api/generate`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     model: 'llama3.2',
    //     prompt: userText,
    //     stream: false,
    //   }),
    // });
    // const data = await response.json();
    // return data.response;
  }

  broadcastToGroup(group, data) {
    if (!this.connected || !this.ws) {
      console.error('❌ Cannot broadcast: not connected');
      return;
    }

    this.ws.send(
      JSON.stringify({
        action: 'sendToGroup',
        group,
        data,
      })
    );
  }

  async close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Start the agent bridge
const agent = new AgentBridge();

agent
  .connect()
  .then(() => {
    console.log('🚀 Agent Bridge is running');
  })
  .catch((error) => {
    console.error('❌ Failed to start agent bridge:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down agent bridge...');
  await agent.close();
  process.exit(0);
});
