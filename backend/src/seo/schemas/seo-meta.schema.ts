import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SeoMetaDocument = HydratedDocument<SeoMeta>;

/** 'global' holds site defaults; others override per entity. */
export type SeoScope = 'global' | 'product' | 'category' | 'page';

@Schema({ timestamps: true, collection: 'seo_meta' })
export class SeoMeta {
  @Prop({ type: String, required: true, index: true })
  scope: SeoScope;

  /** Null for the global defaults; entity id for overrides. */
  @Prop({ type: String, default: null, index: true })
  entityId: string | null;

  @Prop({ default: '' })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: [String], default: [] })
  keywords: string[];

  @Prop({ default: '' })
  ogImage: string;

  @Prop({ default: '' })
  canonicalUrl: string;

  @Prop({ default: false })
  noindex: boolean;
}

export const SeoMetaSchema = SchemaFactory.createForClass(SeoMeta);
SeoMetaSchema.index({ scope: 1, entityId: 1 }, { unique: true });
