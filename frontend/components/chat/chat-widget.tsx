'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { io, type Socket } from 'socket.io-client';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { config } from '@/lib/config';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

interface ChatMessage {
  _id?: string;
  content: string;
  type?: string;
  sender: { id: string; role: string };
  createdAt?: string;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [connecting, setConnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const chatIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Establish the chat + socket when the panel opens (authenticated only).
  useEffect(() => {
    if (!open || !token || socketRef.current) return;
    let cancelled = false;
    setConnecting(true);

    (async () => {
      try {
        const chat = await api.post<{ _id: string }>('/chat/start', {});
        if (cancelled) return;
        chatIdRef.current = chat._id;

        const socket = io(`${config.socketUrl}/chat`, {
          auth: { token },
          transports: ['websocket'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit(
            'join_chat',
            { chatId: chat._id },
            (ack: { history?: ChatMessage[] }) => {
              setConnecting(false);
              if (ack?.history) setMessages([...ack.history].reverse());
            },
          );
        });
        socket.on('message', (msg: ChatMessage) =>
          setMessages((prev) => [...prev, msg]),
        );
        socket.on('connect_error', () => setConnecting(false));
      } catch {
        setConnecting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, token]);

  // Tear down on close.
  useEffect(() => {
    if (open) return;
    socketRef.current?.disconnect();
    socketRef.current = null;
    chatIdRef.current = null;
    setMessages([]);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = () => {
    const content = draft.trim();
    if (!content || !socketRef.current || !chatIdRef.current) return;
    socketRef.current.emit('send_message', { chatId: chatIdRef.current, content });
    setDraft('');
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        aria-label="Open chat"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[28rem] w-80 flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
          <div className="border-b bg-primary px-4 py-3 text-primary-foreground">
            <p className="font-medium">Live support</p>
            <p className="text-xs opacity-80">We typically reply within minutes</p>
          </div>

          {!user ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Sign in to start a conversation with our team.
              </p>
              <Button asChild size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
                {connecting ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Say hello 👋
                  </p>
                ) : (
                  messages.map((m, i) => {
                    const mine = m.sender.id === user.id;
                    const system = m.type === 'SYSTEM';
                    if (system) {
                      return (
                        <p key={m._id ?? i} className="text-center text-xs text-muted-foreground">
                          {m.content}
                        </p>
                      );
                    }
                    return (
                      <div
                        key={m._id ?? i}
                        className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                      >
                        <div
                          className={cn(
                            'max-w-[80%] rounded-2xl px-3 py-1.5 text-sm',
                            mine
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted',
                          )}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center gap-2 border-t p-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Type a message…"
                  className="h-9"
                />
                <Button size="icon" className="h-9 w-9 shrink-0" onClick={send}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
