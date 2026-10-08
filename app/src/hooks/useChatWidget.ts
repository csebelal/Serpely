import { useCallback, useEffect, useRef, useState } from 'react';

export interface WidgetMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
}

const API_BASE = '/chatbot';
const CONV_KEY = 'serpely-chat/conversationId';
const MSGS_KEY = 'serpely-chat/messages';

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota/private-mode errors */
  }
}

interface StreamHandlers {
  onDelta: (content: string) => void;
  onDone: (content: string) => void;
  onError: (message: string) => void;
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function createConversation(title: string): Promise<string> {
  const data = await request('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  return data._id;
}

async function streamChat(
  conversationId: string | null,
  message: string,
  handlers: StreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, message }),
    signal,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Chat request failed');
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = block.split('\n').find((l) => l.startsWith('data: '));
      if (!line) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.error) {
          handlers.onError(String(data.error));
          return;
        }
        if (typeof data.content === 'string' && data.content) {
          full += data.content;
          handlers.onDelta(full);
        }
        if (data.done) {
          handlers.onDone(full);
          return;
        }
      } catch {
        /* skip malformed line */
      }
    }
  }
  handlers.onDone(full);
}

function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<WidgetMessage[]>(() => readStored<WidgetMessage[]>(MSGS_KEY, []));
  const [busy, setBusy] = useState(false);
  const conversationIdRef = useRef<string | null>(readStored<string | null>(CONV_KEY, null));
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    writeStored(MSGS_KEY, messages.slice(-50));
  }, [messages]);

  useEffect(() => {
    if (conversationIdRef.current) writeStored(CONV_KEY, conversationIdRef.current);
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const userMsg: WidgetMessage = { id: newId(), role: 'user', content: trimmed };
    const assistantMsg: WidgetMessage = { id: newId(), role: 'assistant', content: '' };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setBusy(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      if (!conversationIdRef.current) {
        conversationIdRef.current = await createConversation(trimmed.slice(0, 60));
        writeStored(CONV_KEY, conversationIdRef.current);
      }

      await streamChat(
        conversationIdRef.current,
        trimmed,
        {
          onDelta: (content) => {
            setMessages((prev) => prev.map((m) => (m.id === assistantMsg.id ? { ...m, content } : m)));
          },
          onDone: (content) => {
            setMessages((prev) => prev.map((m) => (m.id === assistantMsg.id ? { ...m, content } : m)));
          },
          onError: (errorMessage) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: errorMessage || 'Something went wrong. Please try again.', error: true }
                  : m
              )
            );
          },
        },
        abort.signal
      );
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: err?.message || 'Something went wrong. Please try again.', error: true }
              : m
          )
        );
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }, [busy]);

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearConversation = useCallback(() => {
    abortRef.current?.abort();
    conversationIdRef.current = null;
    sessionStorage.removeItem(CONV_KEY);
    sessionStorage.removeItem(MSGS_KEY);
    setMessages([]);
    setBusy(false);
  }, []);

  return {
    open,
    setOpen,
    messages,
    busy,
    sendMessage,
    stopGenerating,
    clearConversation,
  };
}