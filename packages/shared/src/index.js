/**
 * Shared message contract for ACP Editor
 * Used across client, agent-bridge, and token-broker
 */

/**
 * Message types for Web PubSub communication
 */
export const MessageType = {
  JOIN: 'join',
  LOAD_SESSION: 'loadSession',
  QUEUE_PROMPT: 'queuePrompt',
  SESSION_UPDATE: 'session_update',
};

/**
 * Client -> Agent messages (via Web PubSub)
 */

/**
 * @typedef {Object} JoinMessage
 * @property {'join'} type
 * @property {string} threadId
 */

/**
 * @typedef {Object} LoadSessionMessage
 * @property {'loadSession'} type
 * @property {string} threadId
 */

/**
 * @typedef {Object} ContentBlock
 * @property {string} type - e.g., 'text', 'tool_use', 'tool_result'
 * @property {string} [text] - Text content if type is 'text'
 * @property {Object} [toolUse] - Tool use details if applicable
 * @property {Object} [toolResult] - Tool result details if applicable
 */

/**
 * @typedef {Object} QueuePromptMessage
 * @property {'queuePrompt'} type
 * @property {string} threadId
 * @property {ContentBlock[]} contentBlocks
 */

/**
 * Agent -> Clients messages (via group broadcast)
 */

/**
 * @typedef {Object} SessionUpdateMessage
 * @property {'session_update'} type
 * @property {string} threadId
 * @property {Object} chunk - Delta content (ContentBlock | Diff | ToolEvent)
 */

/**
 * Validation helpers
 */

export function validateJoinMessage(msg) {
  return msg && msg.type === MessageType.JOIN && typeof msg.threadId === 'string';
}

export function validateLoadSessionMessage(msg) {
  return msg && msg.type === MessageType.LOAD_SESSION && typeof msg.threadId === 'string';
}

export function validateQueuePromptMessage(msg) {
  return (
    msg &&
    msg.type === MessageType.QUEUE_PROMPT &&
    typeof msg.threadId === 'string' &&
    Array.isArray(msg.contentBlocks)
  );
}

export function validateSessionUpdateMessage(msg) {
  return (
    msg &&
    msg.type === MessageType.SESSION_UPDATE &&
    typeof msg.threadId === 'string' &&
    msg.chunk !== undefined
  );
}
