'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  sendAiChatMessage,
  type AiChatMessage,
  type ChatTableSpec,
} from '../lib/ai-chat.api';
import { useToastHelpers } from '../lib/toast';
import { getAuthState } from '../lib/auth';
import { getChatFaqsByRole, type ChatFaqRole, type ChatFaqItem } from '../lib/chat-faq.api';
import { Button } from './ui/Button';
import { ChatMarkdown } from './ChatMarkdown';

const STORAGE_KEY = 'sws_ai_chat_messages';

function formatTableCellValue(v: unknown): string {
  if (v == null) return '';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function buildHrefFromTemplate(hrefTemplate: string, row: Record<string, unknown>): string {
  return hrefTemplate.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const val = row[key];
    return val == null ? '' : String(val);
  });
}

function ChatTable({ table }: { table: ChatTableSpec }) {
  return (
    <div className="my-2 rounded-lg border border-slate-200 bg-white overflow-hidden">
      {table.contextHref && (
        <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-[11px] font-bold text-slate-600">
            {table.contextLabel || 'Open in app'}
          </p>
          <Link
            href={table.contextHref}
            className="text-[11px] font-bold text-primary underline underline-offset-2 hover:text-primary-dark"
          >
            View details
          </Link>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs border-collapse">
          <thead className="bg-slate-100">
            <tr>
              {table.columns.map((c) => (
                <th key={c.key} className="border-b border-slate-200 px-3 py-2 text-left font-bold text-slate-700">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                {table.columns.map((c) => {
                  const raw = row[c.key];
                  const displayKey = c.textKey ?? c.key;
                  const displayRaw = (row as any)[displayKey];
                  const display = formatTableCellValue(displayRaw);

                  if (c.hrefTemplate) {
                    const href = buildHrefFromTemplate(c.hrefTemplate, row);
                    return (
                      <td key={c.key} className="border-b border-slate-100 px-3 py-2 text-slate-700">
                        <Link
                          href={href}
                          className="text-primary font-bold underline underline-offset-2 hover:text-primary-dark break-all"
                        >
                          {display}
                        </Link>
                      </td>
                    );
                  }

                  return (
                    <td key={c.key} className="border-b border-slate-100 px-3 py-2 text-slate-700">
                      {formatTableCellValue(raw)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AiChatWidget() {
  const toast = useToastHelpers();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [size, setSize] = useState<'compact' | 'expanded'>('compact');
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [faqPrompts, setFaqPrompts] = useState<ChatFaqItem[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqError, setFaqError] = useState<string | null>(null);
  const [faqRole, setFaqRole] = useState<ChatFaqRole>('customer');

  function normalizeRole(role: string | null): ChatFaqRole | null {
    if (!role) return null;
    const r = role.toUpperCase();
    if (r === 'CUSTOMER') return 'customer';
    if (r === 'MANAGER') return 'manager';
    if (r === 'STAFF') return 'staff';
    if (r === 'ADMIN') return 'admin';
    return null;
  }

  useEffect(() => {
    const role = normalizeRole(getAuthState().role);
    if (!role) return;
    setFaqRole(role);

    setFaqLoading(true);
    setFaqError(null);
    // DB-only: do not show any FAQ until loaded from backend.
    setFaqPrompts([]);

    getChatFaqsByRole(role)
      .then((res) => setFaqPrompts(res.items ?? []))
      .catch((e) => {
        const msg = e instanceof Error ? e.message : 'Failed to load FAQs';
        setFaqError(msg);
      })
      .finally(() => setFaqLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AiChatMessage[];
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      // Avoid persisting on every keystroke during the "streaming" animation.
      if (streaming) return;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)));
    } catch {
      /* ignore */
    }
  }, [messages, streaming]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, loading, streaming]);

  const streamTextIntoLastAssistantMessage = async (fullText: string) => {
    setStreaming(true);
    try {
      // Chunk sizes tuned for a "typewriter" feel without being too slow.
      const step = Math.max(1, Math.round(fullText.length / 120));
      let idx = 0;
      await new Promise<void>((resolve) => {
        const intervalMs = 18;
        const tick = () => {
          idx = Math.min(fullText.length, idx + step);
          setMessages((prev) => {
            // Find the last assistant message and update it in-place.
            const next = [...prev];
            for (let j = next.length - 1; j >= 0; j--) {
              if (next[j]?.role === 'model') {
                next[j] = { ...next[j], content: fullText.slice(0, idx) };
                return next;
              }
            }
            return prev;
          });
          if (idx >= fullText.length) {
            window.clearInterval(timer);
            resolve();
          }
        };

        const timer = window.setInterval(tick, intervalMs);
        tick(); // start immediately
      });
    } finally {
      setStreaming(false);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setInput('');
    const userHistory: AiChatMessage[] = [...messages, { role: 'user', content: text }];
    // Placeholder chỉ để hiển thị streaming ở UI; KHÔNG gửi cho backend.
    const uiMessages: AiChatMessage[] = [
      ...userHistory,
      { role: 'model', content: '' },
    ];
    setMessages(uiMessages);
    setLoading(true);
    try {
      const res = await sendAiChatMessage(userHistory);
      if (res.table) {
        setMessages((prev) => {
          const next = [...prev];
          for (let j = next.length - 1; j >= 0; j--) {
            if (next[j]?.role === 'model') {
              next[j] = { ...next[j], table: res.table };
              break;
            }
          }
          return next;
        });
      }
      await streamTextIntoLastAssistantMessage(res.reply);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Chat request failed';
      toast.error(msg);
      // Remove the empty assistant placeholder if request fails.
      setMessages((m) => {
        if (
          m.length > 0 &&
          m[m.length - 1]?.role === 'model' &&
          m[m.length - 1]?.content === ''
        ) {
          return m.slice(0, -1);
        }
        return m;
      });
      setInput(text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[9990] size-14 rounded-2xl bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-105 transition-transform"
        title={open ? 'Close SIMS assistant' : 'Open SIMS assistant'}
        aria-label="SIMS AI assistant"
      >
        <span className="material-symbols-outlined text-3xl">
          {open ? 'close' : 'smart_toy'}
        </span>
      </button>

      {open && (
        <div
          className={`fixed bottom-24 right-6 z-[9990] flex flex-col bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden ${
            size === 'compact'
              ? 'w-[min(100vw-2rem,400px)] h-[min(70vh,520px)]'
              : 'w-[min(100vw-2rem,640px)] h-[min(85vh,720px)]'
          }`}
        >
          <div className="px-4 py-3 bg-primary text-white flex items-center gap-2 border-b border-white/15">
            <span className="material-symbols-outlined">smart_toy</span>
            <div>
              <p className="font-black text-sm">SIMS Assistant</p>
              <p className="text-[10px] text-white/80 font-medium">
                Flows, contracts, inventory & requests
              </p>
            </div>

            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMessages([])}
                aria-label="Clear chat"
                title="Clear chat"
                className="p-1 rounded-lg hover:bg-white/15 active:scale-[0.99]"
              >
                <span className="material-symbols-outlined text-white/90 text-base">
                  delete
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSize((s) => (s === 'compact' ? 'expanded' : 'compact'))}
                className="p-1 rounded-lg hover:bg-white/15 active:scale-[0.99]"
                aria-label={size === 'compact' ? 'Expand chatbot' : 'Collapse chatbot'}
                title={size === 'compact' ? 'Expand' : 'Collapse'}
              >
                <span className="material-symbols-outlined text-white/90 text-base">
                  {size === 'compact' ? 'open_in_full' : 'close_fullscreen'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-white/15 active:scale-[0.99]"
                aria-label="Close chatbot"
                title="Close"
              >
                <span className="material-symbols-outlined text-white/90 text-base">
                  close
                </span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">
                  Ask about <span className="font-bold text-slate-700">how SIMS works</span>, or your{' '}
                  <span className="font-bold text-slate-700">contracts</span>,{' '}
                  <span className="font-bold text-slate-700">inventory</span>, and{' '}
                  <span className="font-bold text-slate-700">service requests</span>.
                </p>
                <div className="space-y-2">
                  {!faqLoading && faqPrompts.length > 0 && (
                    <>
                      <p className="text-xs font-bold text-slate-600">Frequently asked</p>
                      <div className="flex flex-wrap gap-2">
                        {faqPrompts.map((f: ChatFaqItem) => (
                          <button
                            key={f.label}
                            type="button"
                            className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-full hover:bg-slate-50 active:scale-[0.99] transition"
                            onClick={() => handleSend(f.prompt)}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {faqError && (
                    <p className="text-[11px] text-red-600 mt-2">
                      {faqError}
                    </p>
                  )}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                {m.role === 'model' && (
                  <div className="size-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">smart_toy</span>
                  </div>
                )}

                <div
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-primary text-white rounded-br-md'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
                  }`}
                >
                  {m.role === 'model' && m.table && <ChatTable table={m.table} />}
                  <ChatMarkdown content={m.content} role={m.role} />
                </div>

                {m.role === 'user' && (
                  <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">person</span>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-3 py-2 text-sm text-slate-500 flex items-center gap-2">
                  <span className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  {streaming ? 'Streaming…' : 'Thinking…'}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-slate-200 bg-white flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Type a question…"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              disabled={loading || streaming}
            />
            <Button
              type="button"
              onClick={() => handleSend()}
              disabled={loading || streaming || !input.trim()}
            >
              Send
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
