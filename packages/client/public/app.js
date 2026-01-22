/**
 * ACP Co-Creation Editor Client
 * Browser-side WebSocket client connecting to local broker
 */

const BROKER_URL = 'ws://localhost:8080';

class ACPClient {
  constructor() {
    this.ws = null;
    this.threadId = null;
    this.connected = false;
    this.transcript = [];

    // Get thread ID from URL
    const params = new URLSearchParams(window.location.search);
    this.threadId = params.get('thread') || this.generateThreadId();

    // Update URL if thread ID was generated
    if (!params.get('thread')) {
      const newUrl = `${window.location.pathname}?thread=${this.threadId}`;
      window.history.replaceState({}, '', newUrl);
    }

    this.initializeUI();
  }

  generateThreadId() {
    return `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  initializeUI() {
    // Update thread ID display
    document.getElementById('current-thread').textContent = this.threadId;
    document.getElementById('thread-id').textContent = `Thread: ${this.threadId}`;

    // Set up form handler
    const form = document.getElementById('prompt-form');
    const input = document.getElementById('prompt-input');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (text) {
        this.sendPrompt(text);
        input.value = '';
      }
    });

    // Handle Shift+Enter for new line, Enter to submit
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.dispatchEvent(new Event('submit'));
      }
    });
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.updateStatus('connecting', '🟡 Connecting...');

      this.ws = new WebSocket(BROKER_URL);

      this.ws.onopen = () => {
        console.log('✅ Connected to broker');
        this.connected = true;
        this.updateStatus('connected', '🟢 Connected');

        // Join the thread group
        this.joinThread();

        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        console.log('❌ Disconnected from broker');
        this.connected = false;
        this.updateStatus('disconnected', '⚫ Disconnected');
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        reject(error);
      };
    });
  }

  reconnect() {
    setTimeout(() => {
      console.log('🔄 Reconnecting...');
      this.connect();
    }, 3000);
  }

  updateStatus(status, text) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = text;
    statusEl.className = `status-${status}`;
  }

  joinThread() {
    // Join the thread group
    this.send({
      action: 'joinGroup',
      group: this.threadId,
    });

    // Request to join the session (ACP message)
    this.sendToGroup({
      type: 'join',
      threadId: this.threadId,
    });

    // Load session history
    setTimeout(() => {
      this.sendToGroup({
        type: 'loadSession',
        threadId: this.threadId,
      });
    }, 100);
  }

  sendPrompt(text) {
    if (!this.connected) {
      console.error('Not connected');
      return;
    }

    const message = {
      type: 'queuePrompt',
      threadId: this.threadId,
      contentBlocks: [{ type: 'text', text }],
    };

    this.sendToGroup(message);
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  sendToGroup(data) {
    this.send({
      action: 'sendToGroup',
      group: this.threadId,
      data,
    });
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      console.log('📨 Received:', message);

      switch (message.type) {
        case 'joined':
          console.log(`✅ Joined: ${message.group || message.threadId}`);
          break;
        case 'session_update':
          this.handleSessionUpdate(message);
          break;
        default:
          console.log('⚠️  Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
    }
  }

  handleSessionUpdate(message) {
    const { chunk } = message;
    console.log('📝 Session update:', chunk);

    this.transcript.push(chunk);
    this.renderTranscript();
  }

  renderTranscript() {
    const transcriptEl = document.getElementById('transcript');

    // Remove welcome message if it exists
    const welcome = transcriptEl.querySelector('.welcome-message');
    if (welcome && this.transcript.length > 0) {
      welcome.remove();
    }

    // Clear and re-render all messages
    transcriptEl.innerHTML = '';

    this.transcript.forEach((chunk) => {
      const messageEl = document.createElement('div');
      messageEl.className = `message ${chunk.role || 'system'}`;

      const roleEl = document.createElement('div');
      roleEl.className = 'role';
      roleEl.textContent = chunk.role || 'system';

      const contentEl = document.createElement('div');
      contentEl.className = 'content';

      // Extract text from content blocks
      if (Array.isArray(chunk.content)) {
        const text = chunk.content.map((block) => block.text || '').join('\n');
        contentEl.textContent = text;
      } else {
        contentEl.textContent = JSON.stringify(chunk.content);
      }

      const timestampEl = document.createElement('div');
      timestampEl.className = 'timestamp';
      timestampEl.textContent = new Date(chunk.timestamp).toLocaleTimeString();

      messageEl.appendChild(roleEl);
      messageEl.appendChild(contentEl);
      messageEl.appendChild(timestampEl);

      transcriptEl.appendChild(messageEl);
    });

    // Scroll to bottom
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  }
}

// Initialize client when page loads
const client = new ACPClient();
client
  .connect()
  .then(() => {
    console.log('🚀 Client ready');
  })
  .catch((error) => {
    console.error('❌ Failed to connect:', error);
  });
