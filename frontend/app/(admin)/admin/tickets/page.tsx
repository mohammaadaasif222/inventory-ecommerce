'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  useTicket,
  useTicketMutations,
  useTickets,
  type Ticket,
} from '@/hooks/use-tickets';

const PRIORITY_VARIANT: Record<string, 'destructive' | 'secondary' | 'outline'> = {
  URGENT: 'destructive',
  HIGH: 'destructive',
  MEDIUM: 'secondary',
  LOW: 'outline',
};

export default function TicketsPage() {
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading } = useTickets({ status: status || undefined, priority: priority || undefined });
  const tickets = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Tickets" description="Support queue with SLA tracking." />

      <div className="flex flex-wrap gap-2">
        <FilterSelect value={status} onChange={setStatus} placeholder="All statuses" options={TICKET_STATUSES} />
        <FilterSelect value={priority} onChange={setPriority} placeholder="All priorities" options={TICKET_PRIORITIES} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead className="text-right">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No tickets match.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((t: Ticket) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.ticketNumber}</TableCell>
                  <TableCell className="max-w-xs truncate">{t.subject}</TableCell>
                  <TableCell>
                    <Badge variant={PRIORITY_VARIANT[t.priority] ?? 'outline'}>{t.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {t.slaBreached ? (
                      <Badge variant="destructive">Breached</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">On track</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setOpenId(t.id)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TicketDialog id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: readonly string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function TicketDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: ticket, isLoading } = useTicket(id);
  const { setStatus, setPriority, addNote } = useTicketMutations();
  const [note, setNote] = useState('');
  const [internal, setInternal] = useState(true);

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{ticket?.ticketNumber ?? 'Ticket'}</DialogTitle>
        </DialogHeader>
        {isLoading || !ticket ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="font-medium">{ticket.subject}</p>
              {ticket.description && (
                <p className="text-sm text-muted-foreground">{ticket.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Status</label>
                <select
                  value={ticket.status}
                  onChange={(e) =>
                    setStatus.mutate(
                      { id: ticket.id, status: e.target.value },
                      { onError: (err: Error) => toast.error(err.message) },
                    )
                  }
                  className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  {TICKET_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Priority</label>
                <select
                  value={ticket.priority}
                  onChange={(e) => setPriority.mutate({ id: ticket.id, priority: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  {TICKET_PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Notes</p>
              <div className="max-h-40 space-y-2 overflow-y-auto">
                {(ticket.notes ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No notes yet.</p>
                ) : (
                  ticket.notes!.map((n) => (
                    <div key={n.id} className="rounded-md border p-2 text-sm">
                      <div className="mb-1 flex items-center gap-2">
                        {n.isInternal && <Badge variant="outline">Internal</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {n.body}
                    </div>
                  ))
                )}
              </div>
              <Textarea
                rows={2}
                placeholder="Add a note…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={internal}
                    onChange={(e) => setInternal(e.target.checked)}
                  />
                  Internal (hidden from customer)
                </label>
                <Button
                  size="sm"
                  disabled={!note.trim() || addNote.isPending}
                  onClick={() =>
                    addNote.mutate(
                      { id: ticket.id, body: note, isInternal: internal },
                      { onSuccess: () => { setNote(''); toast.success('Note added'); } },
                    )
                  }
                >
                  Add note
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
