'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useAdminPages,
  usePageMutations,
  type CmsPage,
} from '@/hooks/use-pages';

interface Block {
  type: string;
  data: { text?: string };
}

export default function PagesAdminPage() {
  const { data: pages, isLoading } = useAdminPages();
  const { publish, remove } = usePageMutations();
  const [editing, setEditing] = useState<CmsPage | null | undefined>(undefined);

  return (
    <div className="space-y-6">
      <PageHeader
        title="CMS Pages"
        description="Slug-routed static pages with block content."
        actions={
          <Button onClick={() => setEditing(null)}>
            <Plus className="mr-1 h-4 w-4" /> New page
          </Button>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : !pages || pages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No pages yet.
                </TableCell>
              </TableRow>
            ) : (
              pages.map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell className="font-mono text-xs">/{p.slug}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'PUBLISHED' ? 'success' : 'secondary'}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => publish.mutate({ id: p._id, publish: p.status !== 'PUBLISHED' })}
                    >
                      {p.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(p._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editing !== undefined && (
        <PageDialog page={editing} onClose={() => setEditing(undefined)} />
      )}
    </div>
  );
}

function PageDialog({ page, onClose }: { page: CmsPage | null; onClose: () => void }) {
  const { create, update } = usePageMutations();
  const isEdit = Boolean(page);
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([{ type: 'rich_text', data: { text: '' } }]);

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setBlocks(
        (page.blocks as Block[] | undefined)?.length
          ? (page.blocks as Block[])
          : [{ type: 'rich_text', data: { text: '' } }],
      );
    }
  }, [page]);

  const save = () => {
    const body = { title, blocks };
    const done = () => {
      toast.success(isEdit ? 'Page saved' : 'Page created');
      onClose();
    };
    const err = (e: Error) => toast.error(e.message);
    if (isEdit && page) update.mutate({ id: page._id, body }, { onSuccess: done, onError: err });
    else create.mutate(body, { onSuccess: done, onError: err });
  };

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit page' : 'New page'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="About us" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Blocks</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBlocks((b) => [...b, { type: 'rich_text', data: { text: '' } }])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add block
              </Button>
            </div>
            {blocks.map((block, i) => (
              <div key={i} className="space-y-1 rounded-md border p-2">
                <select
                  value={block.type}
                  onChange={(e) =>
                    setBlocks((b) => b.map((bl, j) => (j === i ? { ...bl, type: e.target.value } : bl)))
                  }
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                >
                  {['rich_text', 'image', 'video', 'divider'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {block.type !== 'divider' && (
                  <Textarea
                    rows={2}
                    placeholder={block.type === 'rich_text' ? 'Text…' : 'URL…'}
                    value={block.data.text ?? ''}
                    onChange={(e) =>
                      setBlocks((b) =>
                        b.map((bl, j) => (j === i ? { ...bl, data: { text: e.target.value } } : bl)),
                      )
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={pending || !title.trim()}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
