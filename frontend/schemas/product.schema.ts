import { z } from 'zod';

export const productStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);
export type ProductStatus = z.infer<typeof productStatusEnum>;

export const productImageSchema = z.object({
  url: z.string(),
  storageId: z.string(),
  provider: z.string(),
  isPrimary: z.boolean().optional(),
  sortOrder: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const variantSchema = z.object({
  id: z.string().optional(),
  size: z.string().optional().default(''),
  color: z.string().optional().default(''),
  material: z.string().optional().default(''),
  price: z.coerce.number().min(0).optional(),
});

export const productFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional().default(''),
  basePrice: z.coerce.number().min(0, 'Price must be ≥ 0'),
  currency: z.string().length(3).default('INR'),
  status: productStatusEnum.default('DRAFT'),
  images: z.array(productImageSchema).default([]),
  variants: z.array(variantSchema).default([]),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
export type ProductImage = z.infer<typeof productImageSchema>;

/** Product shape returned by the API. */
export interface ProductVariant {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  price: number | null;
}
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string | null;
  brandId: string | null;
  tags: string[];
  basePrice: number;
  currency: string;
  status: ProductStatus;
  images: ProductImage[];
  variants: ProductVariant[];
  /** Denormalised review aggregate maintained by the backend. */
  ratingAverage: number;
  ratingCount: number;
  createdAt: string;
}

/** Map a product form (size/color/material) to the backend variant DTO shape. */
export function toCreatePayload(values: ProductFormValues) {
  return {
    name: values.name,
    description: values.description || undefined,
    basePrice: values.basePrice,
    currency: values.currency,
    status: values.status,
    images: values.images,
    variants: values.variants.map((v) => ({
      id: v.id,
      attributes: Object.fromEntries(
        Object.entries({
          size: v.size,
          color: v.color,
          material: v.material,
        }).filter(([, val]) => val && val.length > 0),
      ),
      price: v.price,
    })),
  };
}
