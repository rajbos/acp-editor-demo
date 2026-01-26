import { test } from 'node:test';
import assert from 'node:assert';
import {
  MessageType,
  validateJoinMessage,
  validateLoadSessionMessage,
  validateQueuePromptMessage,
  validateSessionUpdateMessage,
} from './index.js';

test('MessageType constants are defined', () => {
  assert.strictEqual(MessageType.JOIN, 'join');
  assert.strictEqual(MessageType.LOAD_SESSION, 'loadSession');
  assert.strictEqual(MessageType.QUEUE_PROMPT, 'queuePrompt');
  assert.strictEqual(MessageType.SESSION_UPDATE, 'session_update');
});

test('validateJoinMessage accepts valid message', () => {
  const valid = { type: 'join', threadId: 'abc123' };
  assert.strictEqual(validateJoinMessage(valid), true);
});

test('validateJoinMessage rejects invalid message', () => {
  assert.ok(!validateJoinMessage(null));
  assert.ok(!validateJoinMessage({ type: 'join' }));
  assert.ok(!validateJoinMessage({ threadId: 'abc' }));
  assert.ok(!validateJoinMessage({}));
});

test('validateLoadSessionMessage accepts valid message', () => {
  const valid = { type: 'loadSession', threadId: 'abc123' };
  assert.strictEqual(validateLoadSessionMessage(valid), true);
});

test('validateQueuePromptMessage accepts valid message', () => {
  const valid = {
    type: 'queuePrompt',
    threadId: 'abc123',
    contentBlocks: [{ type: 'text', text: 'Hello' }],
  };
  assert.strictEqual(validateQueuePromptMessage(valid), true);
});

test('validateSessionUpdateMessage accepts valid message', () => {
  const valid = {
    type: 'session_update',
    threadId: 'abc123',
    chunk: { type: 'text', text: 'Response' },
  };
  assert.strictEqual(validateSessionUpdateMessage(valid), true);
});
