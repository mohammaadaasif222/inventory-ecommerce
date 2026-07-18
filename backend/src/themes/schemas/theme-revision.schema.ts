import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { ThemeCustomizations } from './theme.schema';

export type ThemeRevisionDocument = HydratedDocument<ThemeRevision>;

export type RevisionReason = 'activate' | 'customize' | 'rollback';

/**
 * A snapshot of the storefront's theme state, written *before* every change.
 *
 * This is the undo stack behind one-click rollback. Snapshotting the prior
 * state before a write (rather than the new state after) means the newest
 * revision is always "what it looked like before the last change" — so a
 * rollback is a single read of the head, not a diff between two records.
 *
 * Both halves are captured because a bad publish can be either: the wrong
 * theme (`activeSlug`) or the right theme wrongly customised
 * (`customizations`).
 */
@Schema({ timestamps: true, collection: 'theme_revisions' })
export class ThemeRevision {
  /** The theme this snapshot's customisations belong to. */
  @Prop({ required: true, index: true })
  slug: string;

  /** Which theme was live when the snapshot was taken. */
  @Prop({ required: true })
  activeSlug: string;

  @Prop({ type: Object, default: {} })
  customizations: ThemeCustomizations;

  @Prop({ type: String, enum: ['activate', 'customize', 'rollback'], required: true })
  reason: RevisionReason;

  /** Who made the change that this snapshot precedes. */
  @Prop({ type: String, default: null })
  userId: string | null;

  /** Consumed revisions are marked rather than deleted, to keep the audit trail. */
  @Prop({ default: false })
  restored: boolean;
}

export const ThemeRevisionSchema = SchemaFactory.createForClass(ThemeRevision);

// Rollback always wants the newest unrestored snapshot; without this the undo
// path collection-scans a table that grows with every customiser keystroke.
ThemeRevisionSchema.index({ restored: 1, createdAt: -1 });
