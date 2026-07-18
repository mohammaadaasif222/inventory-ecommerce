'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQuery } from '@tanstack/react-query';
import { Send, MessageSquare, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { config } from '@/lib/config';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

interface Chat {
  _id: string;
  customerId: string;
  status: string;
  subject: string;
}
interface Msg {
  _id?: string;
  content: string;
  type?: string;
  sender: { id: string; role: string };
}

export default function AgentChatPage() {
  const agentId = useAuthStore((s) => s.user?.id);
  const token = useAuthStore((s) => s.accessToken);

  const waiting = useQuery({
    queryKey: ['chat-waiting'],
    queryFn: () => api.get<Chat[]>('/chat/agent/waiting'),
    refetchInterval: 15000,
  });
  const queue = useQuery({
    queryKey: ['chat-queue'],
    queryFn: () => api.get<Chat[]>('/chat/agent/queue'),
    refetchInterval: 15000,
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Connect to the /agent namespace once.
  useEffect(() => {
    if (!token || socketRef.current) return;
    const socket = io(`${config.socketUrl}/agent`, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;
    socket.on('message', (msg: Msg) => setMessages((prev) => [...prev, msg]));
    socket.on('waiting_chat', () => waiting.refetch());
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const openChat = (id: string) => {
    setActiveId(id);
    setMessages([]);
    socketRef.current?.emit(
      'join_chat',
      { chatId: id },
      (ack: { history?: Msg[] }) => {
        if (ack?.history) setMessages([...ack.history].reverse());
      },
    );
  };

  const send = () => {
    const content = draft.trim();
    if (!content || !activeId) return;
    socketRef.current?.emit('send_message', { chatId: activeId, content });
    setDraft('');
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Live Chat" description="Handle customer conversations in real time." />

      <div className="grid h-[70vh] grid-cols-[260px_1fr] gap-4">
        {/* Sidebar */}
        <div className="space-y-4 overflow-y-auto rounded-md border p-3">
          <ChatList
            label="Waiting"
            chats={waiting.data ?? []}
            loading={waiting.isLoading}
            activeId={activeId}
            onSelect={openChat}
            variant="outline"
          />
          <ChatList
            label="My queue"
            chats={queue.data ?? []}
            loading={queue.isLoading}
            activeId={activeId}
            onSelect={openChat}
            variant="secondary"
          />
        </div>

        {/* Conversation */}
        <div className="flex flex-col rounded-md border">
          {!activeId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
              <MessageSquare className="h-8 w-8" />
              <p className="text-sm">Select a conversation to begin.</p>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages.map((m, i) => {
                  if (m.type === 'SYSTEM') {
                    return (
                      <p key={m._id ?? i} className="text-center text-xs text-muted-foreground">
                        {m.content}
                      </p>
                    );
                  }
                  const mine = m.sender.id === agentId;
                  return (
                    <div key={m._id ?? i} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[70%] rounded-2xl px-3 py-1.5 text-sm',
                          mine ? 'bg-primary text-primary-foreground' : 'bg-muted',
                        )}
                      >
                        {m.content}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 border-t p-3">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Reply to the customer…"
                />
                <Button size="icon" onClick={send}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatList({
  label,
  chats,
  loading,
  activeId,
  onSelect,
  variant,
}: {
  label: string;
  chats: Chat[];
  loading: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  variant: 'outline' | 'secondary';
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Badge variant={variant}>{chats.length}</Badge>
      </div>
      {loading ? (
        <Loader2 className="mx-auto my-2 h-4 w-4 animate-spin text-muted-foreground" />
      ) : chats.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">None</p>
      ) : (
        chats.map((c) => (
          <button
            key={c._id}
            onClick={() => onSelect(c._id)}
            className={cn(
              'w-full rounded-md px-2 py-2 text-left text-sm transition-colors',
              activeId === c._id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
            )}
          >
            <p className="truncate font-medium">{c.subject || 'Customer chat'}</p>
            <p className="truncate text-xs opacity-70">{c.customerId.slice(0, 8)}</p>
          </button>
        ))
      )}
    </div>
  );
}
