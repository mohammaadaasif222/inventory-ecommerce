'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuditLog, usePermissionMatrix } from '@/hooks/use-admin-misc';

export default function SecuritySettingsPage() {
  const [page, setPage] = useState(1);
  const audit = useAuditLog({ page });
  const matrix = usePermissionMatrix();
  const logs = audit.data?.data ?? [];
  const meta = audit.data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader title="Security & Audit" description="Privileged-action log and role permissions." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role &amp; permission matrix</CardTitle>
          <CardDescription>What each role is allowed to do.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {matrix.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            Object.entries(matrix.data ?? {}).map(([role, perms]) => (
              <div key={role} className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="w-32 justify-center">{role}</Badge>
                <span className="text-xs text-muted-foreground">{perms.join(', ')}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit log</CardTitle>
          <CardDescription>Every admin action — who, what, when.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No audit entries yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(l.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">{l.actorEmail ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{l.action}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {l.entityType ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{l.ip ?? '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {meta && meta.totalPages && meta.totalPages > 1 ? (
            <div className="mt-3 flex items-center justify-end gap-2">
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
        </CardContent>
      </Card>
    </div>
  );
}
