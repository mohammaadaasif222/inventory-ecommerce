import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PopupDocument = HydratedDocument<Popup>;

export enum PopupType {
  ANNOUNCEMENT_BAR = 'announcement_bar',
  EXIT_INTENT = 'exit_intent',
  TIMED_MODAL = 'timed_modal',
  COOKIE_CONSENT = 'cookie_consent',
}

export class DisplayRules {
  /** Delay before showing a timed modal (seconds). */
  delaySeconds?: number;
  /** Scroll-depth trigger (%). */
  scrollPercent?: number;
  /** Glob-ish path targets, e.g. ["/", "/products/*"]. Empty = all pages. */
  pageTargets?: string[];
  /** Max times shown per visitor (frequency cap). */
  frequencyCap?: number;
}

@Schema({ timestamps: true, collection: 'popups' })
export class Popup {
  @Prop({ type: String, required: true, enum: PopupType })
  type: PopupType;

  @Prop({ default: '' })
  title: string;

  /** Per-type content (html, image, button text/link, message…). */
  @Prop({ type: Object, default: {} })
  content: Record<string, unknown>;

  @Prop({ type: Object, default: {} })
  displayRules: DisplayRules;

  @Prop({ default: false, index: true })
  isActive: boolean;
}

export const PopupSchema = SchemaFactory.createForClass(Popup);
