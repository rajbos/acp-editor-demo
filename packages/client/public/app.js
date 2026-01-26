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
    // Persistent client identifier and display name per tab/session
    this.clientId = sessionStorage.getItem('acp_client_id') || null;
    if (!this.clientId) {
      this.clientId = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
      sessionStorage.setItem('acp_client_id', this.clientId);
    }

    this.displayName = sessionStorage.getItem('acp_display_name') || null;
    if (!this.displayName) {
      // Friendly generated name
      this.displayName = `User-${this.clientId.slice(-4)}`;
      sessionStorage.setItem('acp_display_name', this.displayName);
    }

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
    return `thread-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  initializeUI() {
    // Update thread ID display
    document.getElementById('current-thread').textContent = this.threadId;
    document.getElementById('thread-id').textContent = `Thread: ${this.threadId}`;
    // Show your name in the header
    const headerEl = document.createElement('div');
    headerEl.style.fontSize = '0.9rem';
    headerEl.style.color = '#fff';
    headerEl.textContent = `You: ${this.displayName}`;
    document.querySelector('header .status').appendChild(headerEl);

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
      clientId: this.clientId,
      displayName: this.displayName,
    });

    // Load session history
    setTimeout(() => {
      this.sendToGroup({
        type: 'loadSession',
        threadId: this.threadId,
        clientId: this.clientId,
        displayName: this.displayName,
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
      clientId: this.clientId,
      displayName: this.displayName,
      contentBlocks: [{ type: 'text', text }],
    };

    // Show the user's own message immediately in the transcript
    const userChunk = {
      role: 'user',
      content: message.contentBlocks,
      timestamp: new Date().toISOString(),
      clientId: this.clientId,
      displayName: this.displayName,
    };
    this.transcript.push(userChunk);
    this.renderTranscript();

    // Add a pending assistant placeholder so UI shows waiting state
    const pendingAssistant = {
      role: 'assistant',
      content: [{ type: 'text', text: '' }],
      timestamp: new Date().toISOString(),
      _pending: true,
    };
    this.transcript.push(pendingAssistant);
    this.renderTranscript();

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
        // Handle queuePrompt payloads (remote user messages)
        case 'queuePrompt': {
          // Convert to session chunk and let handleSessionUpdate apply dedupe logic
          const chunk = {
            role: 'user',
            content: message.contentBlocks || [],
            timestamp: message.timestamp || new Date().toISOString(),
            clientId: message.clientId,
            displayName: message.displayName,
          };
          this.handleSessionUpdate({ chunk });
          break;
        }
        // Ignore ACP lifecycle messages intended only for the agent
        case 'join':
        case 'loadSession':
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

    // Avoid duplicate user message (local echo)
    const last = this.transcript[this.transcript.length - 1];
    if (
      chunk.role === 'user' &&
      last &&
      last.role === 'user' &&
      Array.isArray(chunk.content) &&
      Array.isArray(last.content) &&
      chunk.content.length === last.content.length &&
      chunk.content.every((c, i) => c.text === last.content[i].text)
    ) {
      // It's a local echo, skip adding
      return;
    }

    // Mark local messages for alignment and label
    chunk._isLocal = chunk.clientId && chunk.clientId === this.clientId;

    // If this is a user message, avoid adding a duplicate when the originating client already echoed it.
    if (chunk.role === 'user') {
      const normalize = (c) => (Array.isArray(c) ? c.map((b) => b.text || '').join('\n') : String(c || ''));
      const incoming = normalize(chunk.content);
      const exists = this.transcript.some((item) => item.role === 'user' && item.clientId === chunk.clientId && normalize(item.content) === incoming);
      if (exists) return; // duplicate local echo — ignore
    }

    // Helper: extract plain text from chunk.content (handles arrays, strings, JSON blobs)
    const extractText = (content) => {
      if (content === null || content === undefined) return '';
      let s = '';
      if (Array.isArray(content)) s = content.map((b) => b.text || '').join('\n');
      else if (typeof content === 'string') s = content;
      else s = String(content);

      // Try parse JSON single object
      try {
        const parsed = JSON.parse(s);
        if (typeof parsed === 'object' && parsed !== null) {
          if (parsed.response) return parsed.response;
          if (parsed.text) return parsed.text;
        }
      } catch (e) {
        // not a single JSON object — may be multiple JSON fragments streamed
        // Extract all response fields and join them
        const re = /"response"\s*:\s*"([^\"]*)"/g;
        const parts = [];
        let m;
        while ((m = re.exec(s)) !== null) {
          parts.push(m[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'));
        }
        if (parts.length > 0) return parts.join('');
      }

      return s;
    };

    // Handle assistant partials and final responses to update pending placeholder
    if (chunk.role === 'assistant') {
      // If this is a partial update, update the last pending assistant
      if (chunk._partial) {
        // find last pending assistant
        for (let i = this.transcript.length - 1; i >= 0; i--) {
          const item = this.transcript[i];
          if (item.role === 'assistant' && (item._pending || item._partial)) {
            // append partial text (normalized) to either a pending or an existing partial
            const partialText = extractText(chunk.content || '');
            const existing = extractText(item.content || '');
            item.content = [{ type: 'text', text: existing + partialText }];
            // mark as partial if it wasn't pending
            item._partial = true;
            this.renderTranscript();
            return;
          }
        }

        // No pending assistant found: create a transient assistant partial
        const partialText = extractText(chunk.content || '');
        this.transcript.push({
          role: 'assistant',
          content: [{ type: 'text', text: partialText }],
          timestamp: chunk.timestamp || new Date().toISOString(),
          _partial: true,
        });
        this.renderTranscript();
        return;
      }

      // Final assistant response: replace pending or append
      // Normalize final content to ensure we show only the response text
      const finalText = extractText(chunk.content);
      const finalContent = [{ type: 'text', text: finalText }];

      let replaced = false;
      for (let i = this.transcript.length - 1; i >= 0; i--) {
        const item = this.transcript[i];
        if (item.role === 'assistant' && (item._pending || item._partial)) {
          // replace content and clear pending/partial flags
          item.content = finalContent;
          item.timestamp = chunk.timestamp || new Date().toISOString();
          delete item._pending;
          delete item._partial;
          replaced = true;
          break;
        }
      }

      if (!replaced) {
        // push normalized final chunk
        const pushed = Object.assign({}, chunk, { content: finalContent });
        this.transcript.push(pushed);
      }

      this.renderTranscript();
      return;
    }

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
      const roleClass = chunk.role || 'system';
      const localityClass = chunk._isLocal ? 'local' : 'remote';
      messageEl.className = `message ${roleClass} ${localityClass}`;

      const roleEl = document.createElement('div');
      roleEl.className = 'role';
      if (chunk._isLocal) {
        roleEl.textContent = `${chunk.displayName || 'You'} (you)`;
      } else {
        roleEl.textContent = chunk.displayName || chunk.role || 'system';
      }

      const contentEl = document.createElement('div');
      contentEl.className = 'content';

      // Extract text from content blocks
      if (Array.isArray(chunk.content)) {
        const text = chunk.content.map((block) => block.text || '').join('\n');
        contentEl.textContent = text;
      } else if (typeof chunk.content === 'string') {
        contentEl.textContent = chunk.content;
      } else {
        // Fallback for complex objects
        contentEl.textContent = JSON.stringify(chunk.content, null, 2);
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
