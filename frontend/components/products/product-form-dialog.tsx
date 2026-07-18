'use client';

import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileUploader } from '@/components/upload/file-uploader';
import {
  productFormSchema,
  toCreatePayload,
  type Product,
  type ProductFormValues,
} from '@/schemas/product.schema';
import {
  useCreateProduct,
  useUpdateProduct,
} from '@/hooks/use-products';

const STATUSES: ProductFormValues['status'][] = [
  'DRAFT',
  'ACTIVE',
  'ARCHIVED',
];

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}) {
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const isEdit = Boolean(product);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      description: '',
      basePrice: 0,
      currency: 'INR',
      status: 'DRAFT',
      images: [],
      variants: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'variants',
  });
  const images = form.watch('images');

  useEffect(() => {
    if (open) {
      form.reset(
        product
          ? {
              name: product.name,
              description: product.description ?? '',
              basePrice: product.basePrice,
              currency: product.currency,
              status: product.status,
              images: product.images ?? [],
              variants: (product.variants ?? []).map((v) => ({
                id: v.id,
                size: v.attributes.size ?? '',
                color: v.attributes.color ?? '',
                material: v.attributes.material ?? '',
                price: v.price ?? undefined,
              })),
            }
          : {
              name: '',
              description: '',
              basePrice: 0,
              currency: 'INR',
              status: 'DRAFT',
              images: [],
              variants: [],
            },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  const submit = form.handleSubmit((values) => {
    const payload = toCreatePayload(values);
    const onDone = () => {
      toast.success(isEdit ? 'Product updated' : 'Product created');
      onOpenChange(false);
    };
    const onErr = (e: Error) => toast.error(e.message);
    if (isEdit && product) {
      update.mutate({ id: product.id, payload }, { onSuccess: onDone, onError: onErr });
    } else {
      create.mutate(payload, { onSuccess: onDone, onError: onErr });
    }
  });

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit product' : 'New product'}</DialogTitle>
          <DialogDescription>
            Images upload through the active storage provider. SKUs are
            auto-generated per variant.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input {...form.register('name')} placeholder="Classic T-Shirt" />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea {...form.register('description')} rows={3} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Base price</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register('basePrice')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input {...form.register('currency')} maxLength={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                {...form.register('status')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Image gallery */}
          <div className="space-y-2">
            <Label>Images</Label>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((img) => (
                  <div
                    key={img.storageId}
                    className="relative h-16 w-16 overflow-hidden rounded border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
            <FileUploader
              folder="products"
              accept={{ 'image/*': [] }}
              maxFiles={6}
              maxSize={5 * 1024 * 1024}
              onUploadComplete={(results) =>
                form.setValue('images', [
                  ...form.getValues('images'),
                  ...results.map((r, i) => ({
                    url: r.url,
                    storageId: r.storageId,
                    provider: r.provider,
                    isPrimary: images.length === 0 && i === 0,
                    sortOrder: images.length + i,
                    width: r.width,
                    height: r.height,
                  })),
                ])
              }
            />
          </div>

          {/* Variants */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Variants</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ size: '', color: '', material: '', price: undefined })
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add variant
              </Button>
            </div>
            {fields.map((field, i) => (
              <div key={field.id} className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Size"
                    {...form.register(`variants.${i}.size`)}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Color"
                    {...form.register(`variants.${i}.color`)}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Material"
                    {...form.register(`variants.${i}.material`)}
                  />
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    {...form.register(`variants.${i}.price`)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
