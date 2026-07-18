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

  /**
   * Theme slug this section belongs to, or null for every theme.
   *
   * Lets each theme carry its own hero and sections (a perfume hero on
   * Essence, a room hero on Hearth) while shared sections stay shared.
   */
  @Prop({ type: String, default: null, index: true })
  theme: string | null;
}

export const HomepageSectionSchema =
  SchemaFactory.createForClass(HomepageSection);
