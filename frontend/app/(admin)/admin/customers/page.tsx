'use client';

import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCustomers, useSetBan } from '@/hooks/use-customers';

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useCustomers({ page, limit: 15, search });
  const setBan = useSetBan();
  const customers = data?.data ?? [];
  const meta = data?.meta;

  const toggleBan = (id: string, banned: boolean) =>
    setBan.mutate(
      { id, ban: !banned },
      {
        onSuccess: () => toast.success(banned ? 'User unbanned' : 'User banned'),
        onError: (e: Error) => toast.error(e.message),
      },
    );

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description="Manage accounts and access." />

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-8"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => {
                const banned = c.status === 'BANNED';
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.fullName || '—'}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {c.roles.join(', ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={banned ? 'destructive' : 'success'}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={banned ? 'outline' : 'destructive'}
                        size="sm"
                        onClick={() => toggleBan(c.id, banned)}
                      >
                        {banned ? 'Unban' : 'Ban'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {meta && meta.totalPages && meta.totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= (meta.totalPages ?? 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
