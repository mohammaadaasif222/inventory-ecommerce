'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, GripVertical } from 'lucide-react';
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
  useAdminArticles,
  useArticleMutations,
  type AdminArticle,
} from '@/hooks/use-kb-admin';

interface Block {
  type: string;
  data: { text?: string };
}

export default function KnowledgeBasePage() {
  const { data: articles, isLoading } = useAdminArticles();
  const { publish, remove } = useArticleMutations();
  const [editing, setEditing] = useState<AdminArticle | null | undefined>(undefined);
  // undefined = closed, null = new, object = edit

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base"
        description="Author and publish help-center articles."
        actions={
          <Button onClick={() => setEditing(null)}>
            <Plus className="mr-1 h-4 w-4" /> New article
          </Button>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Helpful</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : !articles || articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No articles yet.
                </TableCell>
              </TableRow>
            ) : (
              articles.map((a) => (
                <TableRow key={a._id}>
                  <TableCell className="font-medium">
                    {a.title}
                    {a.kind === 'post' && (
                      <Badge variant="outline" className="ml-2 align-middle">
                        Journal
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.status === 'PUBLISHED' ? 'success' : 'secondary'}>
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{a.views ?? 0}</TableCell>
                  <TableCell className="text-right">
                    {a.helpfulYes ?? 0}/{a.helpfulNo ?? 0}
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(a)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        publish.mutate({ id: a._id, publish: a.status !== 'PUBLISHED' })
                      }
                    >
                      {a.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove.mutate(a._id)}
                    >
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
        <ArticleDialog article={editing} onClose={() => setEditing(undefined)} />
      )}
    </div>
  );
}

function ArticleDialog({
  article,
  onClose,
}: {
  article: AdminArticle | null;
  onClose: () => void;
}) {
  const { create, update } = useArticleMutations();
  const isEdit = Boolean(article);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [kind, setKind] = useState<'help' | 'post'>('help');
  const [blocks, setBlocks] = useState<Block[]>([{ type: 'paragraph', data: { text: '' } }]);

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setExcerpt(article.excerpt ?? '');
      setKind(article.kind ?? 'help');
      setBlocks(
        (article.blocks as Block[] | undefined)?.length
          ? (article.blocks as Block[])
          : [{ type: 'paragraph', data: { text: '' } }],
      );
    }
  }, [article]);

  const save = () => {
    const body = { title, excerpt, blocks, kind };
    const onDone = () => {
      toast.success(isEdit ? 'Article saved' : 'Article created');
      onClose();
    };
    const onErr = (e: Error) => toast.error(e.message);
    if (isEdit && article) {
      update.mutate({ id: article._id, body }, { onSuccess: onDone, onError: onErr });
    } else {
      create.mutate(body, { onSuccess: onDone, onError: onErr });
    }
  };

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit article' : 'New article'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Excerpt</Label>
            <Input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Appears in</Label>
            <div className="flex gap-2">
              {(
                [
                  ['help', 'Help centre'],
                  ['post', 'Journal (/blog)'],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={kind === value ? 'default' : 'outline'}
                  onClick={() => setKind(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Help articles power the support centre and chatbot; journal posts
              appear on the storefront blog. Never both.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Content blocks</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBlocks((b) => [...b, { type: 'paragraph', data: { text: '' } }])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add block
              </Button>
            </div>
            {blocks.map((block, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border p-2">
                <GripVertical className="mt-2 h-4 w-4 text-muted-foreground" />
                <div className="flex-1 space-y-2">
                  <select
                    value={block.type}
                    onChange={(e) =>
                      setBlocks((b) =>
                        b.map((bl, j) => (j === i ? { ...bl, type: e.target.value } : bl)),
                      )
                    }
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                  >
                    {['paragraph', 'heading', 'code'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <Textarea
                    rows={2}
                    value={block.data.text ?? ''}
                    onChange={(e) =>
                      setBlocks((b) =>
                        b.map((bl, j) =>
                          j === i ? { ...bl, data: { text: e.target.value } } : bl,
                        ),
                      )
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setBlocks((b) => b.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
