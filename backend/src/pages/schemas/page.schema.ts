import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PageDocument = HydratedDocument<Page>;

export enum PageStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export class PageSeo {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
}

/** A content block: rich_text | image | video | divider. */
export class PageBlock {
  type: string;
  data: Record<string, unknown>;
}

@Schema({ timestamps: true, collection: 'cms_pages' })
export class Page {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ type: [Object], default: [] })
  blocks: PageBlock[];

  @Prop({ type: Object, default: {} })
  seo: PageSeo;

  @Prop({ type: String, enum: PageStatus, default: PageStatus.DRAFT, index: true })
  status: PageStatus;

  @Prop({ type: Date, default: null })
  publishedAt: Date | null;
}

export const PageSchema = SchemaFactory.createForClass(Page);
