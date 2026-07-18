'use client';

import { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, Trash2, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  useAdminSections,
  useSectionMutations,
  type Section,
} from '@/hooks/use-website';

const SECTION_TYPES = [
  'hero_banner',
  'featured_products',
  'testimonials',
  'countdown_timer',
  'newsletter',
  'custom_html',
];

export default function HomepageBuilderPage() {
  const { data, isLoading } = useAdminSections();
  const { create, toggle, reorder, remove } = useSectionMutations();
  const [items, setItems] = useState<Section[]>([]);
  const [newType, setNewType] = useState(SECTION_TYPES[0]);

  useEffect(() => {
    if (data) setItems([...data].sort((a, b) => a.order - b.order));
  }, [data]);

  const sensors = useSensors(useSensor(PointerSensor));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i._id === active.id);
    const newIdx = items.findIndex((i) => i._id === over.id);
    const next = arrayMove(items, oldIdx, newIdx);
    setItems(next);
    reorder.mutate(
      next.map((i) => i._id),
      { onError: (err: Error) => toast.error(err.message) },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homepage Builder"
        description="Drag to reorder, toggle visibility, and edit sections."
        actions={
          <div className="flex gap-2">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              {SECTION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <Button
              onClick={() =>
                create.mutate(
                  { type: newType, title: newType.replace(/_/g, ' ') },
                  { onSuccess: () => toast.success('Section added') },
                )
              }
            >
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed py-16 text-center text-muted-foreground">
          No sections yet — add one to start building the homepage.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i._id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((section) => (
                <SortableSection
                  key={section._id}
                  section={section}
                  onToggle={() => toggle.mutate(section._id)}
                  onRemove={() => remove.mutate(section._id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableSection({
  section,
  onToggle,
  onRemove,
}: {
  section: Section;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section._id });

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 p-3 ${isDragging ? 'opacity-60 shadow-lg' : ''}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground">
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1">
        <p className="font-medium">{section.title || section.type}</p>
        <Badge variant="outline" className="mt-1">{section.type}</Badge>
      </div>
      <Button variant="ghost" size="icon" onClick={onToggle} title="Toggle visibility">
        {section.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
      </Button>
      <Button variant="ghost" size="icon" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </Card>
  );
}
