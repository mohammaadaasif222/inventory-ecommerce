import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type HomepageSectionDocument = HydratedDocument<HomepageSection>;

export enum SectionType {
  HERO_BANNER = 'hero_banner',
  FEATURED_PRODUCTS = 'featured_products',
  TESTIMONIALS = 'testimonials',
  COUNTDOWN_TIMER = 'countdown_timer',
  NEWSLETTER = 'newsletter',
  CUSTOM_HTML = 'custom_html',
}

@Schema({ timestamps: true, collection: 'homepage_sections' })
export class HomepageSection {
  @Prop({ type: String, required: true, enum: SectionType })
  type: SectionType;

  @Prop({ default: '' })
  title: string;

  /** Free-form per-section config (slides, product ids, html, end time…). */
  @Prop({ type: Object, default: {} })
  config: Record<string, unknown>;

  @Prop({ default: 0, index: true })
  order: number;

  @Prop({ default: true })
  isVisible: boolean;
}

export const HomepageSectionSchema =
  SchemaFactory.createForClass(HomepageSection);
