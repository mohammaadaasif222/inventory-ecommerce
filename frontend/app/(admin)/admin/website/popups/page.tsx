'use client';

import { useState } from 'react';
import { Image as ImageIcon, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { FileUploader } from '@/components/upload/file-uploader';
import {
  POPUP_TYPES,
  usePopupMutations,
  usePopups,
  type Popup,
  type PopupContent,
} from '@/hooks/use-website';

const EMPTY_CONTENT: PopupContent = {
  message: '',
  imageUrl: '',
  buttonLabel: '',
  buttonUrl: '',
};

/** Strip empty strings so the stored content only carries real values. */
function cleanContent(c: PopupContent): PopupContent {
  const out: PopupContent = {};
  if (c.message?.trim()) out.message = c.message.trim();
  if (c.imageUrl?.trim()) out.imageUrl = c.imageUrl.trim();
  if (c.buttonLabel?.trim()) out.buttonLabel = c.buttonLabel.trim();
  if (c.buttonUrl?.trim()) out.buttonUrl = c.buttonUrl.trim();
  return out;
}

/** Shared banner/message/button fields for the create form and edit panel. */
function ContentFields({
  value,
  onChange,
}: {
  value: PopupContent;
  onChange: (next: PopupContent) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Message</label>
        <Input
          value={value.message ?? ''}
          onChange={(e) => onChange({ ...value, message: e.target.value })}
          placeholder="Get 20% off everything this week"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Button label</label>
          <Input
            value={value.buttonLabel ?? ''}
            onChange={(e) => onChange({ ...value, buttonLabel: e.target.value })}
            placeholder="Shop now"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Button link</label>
          <Input
            value={value.buttonUrl ?? ''}
            onChange={(e) => onChange({ ...value, buttonUrl: e.target.value })}
            placeholder="/products or https://…"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Banner image</label>
        {value.imageUrl ? (
          <div className="relative w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.imageUrl}
              alt="Popup banner"
              className="h-24 rounded-md border object-cover"
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute -right-2 -top-2 h-6 w-6 rounded-full shadow"
              onClick={() => onChange({ ...value, imageUrl: '' })}
              aria-label="Remove banner image"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <FileUploader
            folder="popups"
            accept={{ 'image/*': [] }}
            maxFiles={1}
            onUploadComplete={(results) =>
              onChange({ ...value, imageUrl: results[0]?.url ?? '' })
            }
          />
        )}
      </div>
    </div>
  );
}

function PopupRow({ popup }: { popup: Popup }) {
  const { update, toggle, remove } = usePopupMutations();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(popup.title);
  const [content, setContent] = useState<PopupContent>({
    ...EMPTY_CONTENT,
    ...popup.content,
  });

  const save = () => {
    update.mutate(
      { id: popup._id, body: { title, content: cleanContent(content) } },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success('Popup updated');
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            {popup.content?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={popup.content.imageUrl}
                alt=""
                className="h-10 w-16 shrink-0 rounded border object-cover"
              />
            ) : (
              <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded border bg-muted">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium">{popup.title || popup.type}</p>
              <Badge variant="outline" className="mt-1">{popup.type}</Badge>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={popup.isActive ? 'success' : 'secondary'}>
              {popup.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => toggle.mutate(popup._id)}>
              {popup.isActive ? 'Disable' : 'Enable'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditing((v) => !v)}
              aria-label="Edit popup"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => remove.mutate(popup._id)}
              aria-label="Delete popup"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {editing && (
          <div className="mt-3 space-y-3 border-t pt-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <ContentFields value={content} onChange={setContent} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={update.isPending}>
                {update.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PopupsPage() {
  const { data: popups, isLoading } = usePopups();
  const { create } = usePopupMutations();
  const [type, setType] = useState<string>(POPUP_TYPES[0]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<PopupContent>(EMPTY_CONTENT);

  const add = () => {
    if (!title.trim()) return toast.error('Enter a title');
    create.mutate(
      { type, title, content: cleanContent(content) },
      {
        onSuccess: () => {
          setTitle('');
          setContent(EMPTY_CONTENT);
          toast.success('Popup created');
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Popups" description="Announcement bars, modals and cookie consent." />

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              >
                {POPUP_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-muted-foreground">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summer sale" />
            </div>
          </div>

          <ContentFields value={content} onChange={setContent} />

          <div className="flex justify-end">
            <Button onClick={add} disabled={create.isPending}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !popups || popups.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No popups yet.</p>
      ) : (
        <div className="space-y-2">
          {popups.map((p) => (
            <PopupRow key={p._id} popup={p} />
          ))}
        </div>
      )}
    </div>
  );
}
