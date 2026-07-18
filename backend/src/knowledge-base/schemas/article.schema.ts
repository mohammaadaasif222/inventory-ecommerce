import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ArticleDocument = HydratedDocument<Article>;

export enum ArticleStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

/**
 * What an article *is*, not where it shows: `help` articles power the support
 * centre (`/help`, chatbot grounding), `post` articles power the storefront
 * journal (`/blog`). One collection because the authoring shape is identical —
 * the discriminator exists so the two surfaces stop sharing content.
 */
export enum ArticleKind {
  HELP = 'help',
  POST = 'post',
}

/** A content block (heading, paragraph, image, list, code, …). */
export class ContentBlock {
  type: string;
  data: Record<string, unknown>;
}

@Schema({ timestamps: true, collection: 'kb_articles' })
export class Article {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ default: '' })
  excerpt: string;

  @Prop({ type: [Object], default: [] })
  blocks: ContentBlock[];

  /** Flattened text for search indexing. */
  @Prop({ default: '' })
  searchText: string;

  @Prop({ type: String, index: true, default: null })
  categoryId: string | null;

  @Prop({ type: [String], default: [], index: true })
  tags: string[];

  @Prop({
    type: String,
    enum: ArticleStatus,
    default: ArticleStatus.DRAFT,
    index: true,
  })
  status: ArticleStatus;

  /** Defaults to `help` so every pre-discriminator article stays where it was. */
  @Prop({
    type: String,
    enum: ArticleKind,
    default: ArticleKind.HELP,
    index: true,
  })
  kind: ArticleKind;

  @Prop({ default: 0 })
  helpfulYes: number;

  @Prop({ default: 0 })
  helpfulNo: number;

  @Prop({ default: 0 })
  views: number;

  @Prop()
  authorId?: string;

  @Prop({ type: Date, default: null })
  publishedAt: Date | null;
}

export const ArticleSchema = SchemaFactory.createForClass(Article);
// Weighted full-text index for the search endpoint.
ArticleSchema.index({ title: 'text', searchText: 'text' });
