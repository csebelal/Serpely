import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Square, Trash2 } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatWidget, type WidgetMessage } from '../hooks/useChatWidget';

const COLORS = {
  accent: '#00A868',
  accentDark: '#00C27A',
  accentHover: '#00E08F',
};

export function ChatWidget() {
  const { open, setOpen, messages, busy, sendMessage, stopGenerating, clearConversation } = useChatWidget();
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    sendMessage(text);
    setDraft('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <>
      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 10000,
          width: 56,
          height: 56,
          borderRadius: 28,
          background: COLORS.accent,
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0, 168, 104, 0.35), 0 2px 8px rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.18s, background 0.18s, box-shadow 0.18s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.06)';
          e.currentTarget.style.background = COLORS.accentHover;
          e.currentTarget.style.boxShadow = '0 6px 28px rgba(0, 168, 104, 0.45), 0 4px 14px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.background = COLORS.accent;
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 168, 104, 0.35), 0 2px 8px rgba(0,0,0,0.08)';
        }}
      >
        {open ? <X size={24} strokeWidth={2.4} /> : <MessageCircle size={24} strokeWidth={2.2} />}
      </button>

      {/* ── Chat window ── */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 92,
            right: 24,
            zIndex: 10000,
            width: 380,
            maxWidth: 'calc(100vw - 32px)',
            height: 520,
            maxHeight: 'calc(100vh - 120px)',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 18,
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.1)',
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text)',
            fontFamily: "'Satoshi', system-ui, sans-serif",
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--card-bg)',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: COLORS.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MessageCircle size={16} color="#fff" strokeWidth={2.2} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.015em', lineHeight: 1.2 }}>Serpely AI</div>
                <div style={{ fontSize: 12, color: 'var(--text-ghost)', lineHeight: 1.3 }}>Ask anything about SEO</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {messages.length > 0 && (
                <button
                  onClick={clearConversation}
                  title="New conversation"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-ghost)',
                    cursor: 'pointer',
                    padding: 6,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.accent; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-ghost)'; }}
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-ghost)',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-ghost)'; }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ── Messages ── */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {messages.length === 0 && <EmptyState onSend={sendMessage} />}

            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} busy={busy} />
            ))}
            <div ref={endRef} />
          </div>

          {/* ── Input ── */}
          <form
            onSubmit={handleSubmit}
            style={{
              padding: '10px 12px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'flex-end',
              gap: 8,
              background: 'var(--card-bg)',
              flexShrink: 0,
            }}
          >
            <textarea
              ref={inputRef}
              placeholder="Ask a question..."
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                resize: 'none',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: 14,
                fontFamily: "'Satoshi', system-ui, sans-serif",
                background: 'var(--input-bg)',
                color: 'var(--text)',
                outline: 'none',
                lineHeight: 1.5,
                maxHeight: 100,
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = COLORS.accent; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
            {busy ? (
              <button
                type="button"
                onClick={stopGenerating}
                title="Stop generating"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-soft)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-subtle)'; }}
              >
                <Square size={16} fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!draft.trim() || busy}
                title="Send"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: COLORS.accent,
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  opacity: draft.trim() ? 1 : 0.5,
                  transition: 'background 0.15s, opacity 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.accentHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = COLORS.accent; }}
              >
                <Send size={16} />
              </button>
            )}
          </form>
        </div>
      )}
    </>
  );
}

function EmptyState({ onSend }: { onSend: (q: string) => void }) {
  const suggestions = [
    'What is GEO Score?',
    'Pricing plans',
    'AI citation tracking',
    'How does Serpely audit my site?',
    'How do I track brand mentions in AI?',
    'What features are included?',
    'Does it work with Google & Bing?',
    'How is my SERP performance scored?',
  ];
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '32px 16px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MessageCircle size={22} color="var(--text-ghost)" strokeWidth={1.8} />
      </div>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '-0.015em', color: 'var(--text)' }}>
        How can I help?
      </p>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-ghost)', lineHeight: 1.5, maxWidth: 260 }}>
        Ask me about Serpely's features, SEO, AI search visibility, or anything else.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 4 }}>
        {suggestions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onSend(q)}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: COLORS.accent,
              background: 'rgba(0, 168, 104, 0.08)',
              border: '1px solid rgba(0, 168, 104, 0.2)',
              borderRadius: 8,
              padding: '4px 10px',
              letterSpacing: '-0.005em',
              cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 168, 104, 0.18)';
              e.currentTarget.style.borderColor = COLORS.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 168, 104, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(0, 168, 104, 0.2)';
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message: msg, busy }: { message: WidgetMessage; busy: boolean }) {
  const isUser = msg.role === 'user';
  const isAssistant = msg.role === 'assistant';
  const isStreaming = isAssistant && busy && !msg.content;
  const hasContent = msg.content && msg.content.length > 0;
  const showTyping = isStreaming && !hasContent;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: '85%',
          padding: '10px 14px',
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          background: isUser ? COLORS.accent : 'var(--bg-subtle)',
          color: isUser ? '#fff' : 'var(--text)',
          border: isUser ? 'none' : '1px solid var(--border)',
          fontSize: 14,
          lineHeight: 1.6,
          wordBreak: 'break-word',
          boxShadow: isUser ? '0 2px 8px rgba(0,168,104,0.15)' : '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        {showTyping ? (
          <TypingIndicator />
        ) : isAssistant ? (
          <Markdown remarkPlugins={[remarkGfm]}>{msg.content || ''}</Markdown>
        ) : (
          <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '2px 0' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            background: 'var(--text-ghost)',
            animation: `chat-dot-bounce 1.4s ${i * 0.16}s ease-in-out infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes chat-dot-bounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}