/**
 * ChatPanel — Real-time messaging between Provider and Requester
 * Swiggy/Zomato style chat integrated into dispatch workflow.
 * Messages stored in Firestore: chats/{dispatchId}/messages/{messageId}
 */
import { useState, useEffect, useRef } from 'react';
import { subscribeToChatMessages, sendChatMessage } from '../lib/api';

export default function ChatPanel({ dispatchId, currentUserId, currentUserName, currentUserRole, autoOpen = false, chatTitle }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isOpen, setIsOpen] = useState(autoOpen);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Sync autoOpen prop to state when it changes
  useEffect(() => {
    if (autoOpen) setIsOpen(true);
  }, [autoOpen, dispatchId]);

  // Subscribe to real-time chat messages
  useEffect(() => {
    if (!dispatchId) return;
    const unsub = subscribeToChatMessages(dispatchId, (msgs) => {
      setMessages(msgs);
    });
    return unsub;
  }, [dispatchId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await sendChatMessage(dispatchId, {
        text: newMessage.trim(),
        sender_id: currentUserId,
        sender_name: currentUserName || 'User',
        sender_role: currentUserRole, // 'provider' or 'requester'
      });
      setNewMessage('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  // Quick replies
  const quickReplies = currentUserRole === 'provider'
    ? ['On my way!', 'ETA 5 mins', 'I have arrived', 'Need more info']
    : currentUserRole === 'community' 
      ? ['Hi, how can I help?', 'Where are you located?', 'I have supplies.']
      : ['Thank you!', 'Please hurry', 'Location updated', 'We are safe now'];

  const unreadCount = messages.filter(m => m.sender_role !== currentUserRole).length;

  if (!isOpen) {
    return (
      <button
        className="chat-fab"
        onClick={() => setIsOpen(true)}
        title="Open Chat"
      >
        💬
        {unreadCount > 0 && (
          <span className="chat-fab-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>
    );
  }

  return (
    <div className="chat-panel animate-slide-up">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-header-dot" />
          <div>
            <div className="chat-header-title">
              {chatTitle ? chatTitle : currentUserRole === 'provider' ? '💬 Chat with Requester' : '💬 Chat with Provider'}
            </div>
            <div className="chat-header-sub">Real-time • #{dispatchId?.slice(0, 8)}</div>
          </div>
        </div>
        <button className="chat-close-btn" onClick={() => setIsOpen(false)}>✕</button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
            <div className="text-sm text-muted">No messages yet</div>
            <div className="text-xs text-muted">Send a message to start the conversation</div>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={`chat-message ${isMine ? 'mine' : 'theirs'}`}>
              <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                {!isMine && (
                  <div className="chat-sender-name">
                    {msg.sender_role === 'provider' ? '🤝' : '🆘'} {msg.sender_name}
                  </div>
                )}
                <div className="chat-text">{msg.text}</div>
                <div className="chat-time">
                  {msg.timestamp
                    ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '...'
                  }
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      <div className="chat-quick-replies">
        {quickReplies.map((reply) => (
          <button
            key={reply}
            className="chat-quick-btn"
            onClick={() => {
              setNewMessage(reply);
              inputRef.current?.focus();
            }}
          >
            {reply}
          </button>
        ))}
      </div>

      {/* Input */}
      <form className="chat-input-area" onSubmit={handleSend}>
        <input
          ref={inputRef}
          className="chat-input"
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!newMessage.trim() || sending}
        >
          {sending ? '...' : '➤'}
        </button>
      </form>
    </div>
  );
}
