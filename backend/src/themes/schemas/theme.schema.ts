import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ThemeDocument = HydratedDocument<Theme>;

/**
 * Per-theme customiser overrides.
 *
 * Everything here is a *partial* override applied on top of whatever the
 * theme package declares in its `theme.config.json`. Storing only the delta is
 * what lets a theme ship a new version with a retuned palette and have the
 * merchant's logo and brand colour survive the upgrade.
 *
 * Kept as a loose object rather than a nested schema on purpose: the token set
 * belongs to the theme package on disk, and pinning it here would mean a
 * backend migration every time a theme adds a token.
 */
export interface ThemeCustomizations {
  /** Partial shadcn colour tokens, per mode: `{ light: { primary: '36 46% 52%' } }`. */
  colors?: { light?: Record<string, string>; dark?: Record<string, string> };
  fonts?: { display?: string; body?: string };
  radius?: string;
  /** Shared layout preset id — keeps design and arrangement orthogonal. */
  layoutPreset?: string;
  /** Default colour mode for new visitors; their own choice still wins. */
  appearance?: 'light' | 'dark' | 'system';
  logoUrl?: string;
  faviconUrl?: string;
  /** Homepage section ids in the merchant's chosen order (drag-and-drop). */
  sectionOrder?: string[];
}

/**
 * An installed theme.
 *
 * The *code* for a theme lives on disk in the frontend's `themes/` directory;
 * this collection records its installed state, version and customisations —
 * the same split WordPress uses between `wp-content/themes` and the database.
 * `POST /themes/sync` reconciles this collection with what is actually on disk.
 *
 * Exactly one document has `active: true`, enforced in the service rather than
 * by an index: a partial unique index on `{ active: true }` would reject the
 * intermediate state during a switch, forcing a transaction across two writes
 * for no real gain.
 */
@Schema({ timestamps: true, collection: 'themes' })
export class Theme {
  /** Matches the package's directory name — the id core and disk agree on. */
  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ required: true })
  name: string;

  /** Version last seen on disk; a change signals the package was upgraded. */
  @Prop({ required: true, default: '0.0.0' })
  version: string;

  @Prop({ default: '' })
  description: string;

  /** Slug of the parent package, or null for a standalone theme. */
  @Prop({ type: String, default: null })
  extends: string | null;

  /** Only one theme is active per store at a time. */
  @Prop({ default: false, index: true })
  active: boolean;

  @Prop({ type: Object, default: {} })
  customizations: ThemeCustomizations;

  /** False once the package disappears from disk, so history survives. */
  @Prop({ default: true })
  installed: boolean;
}

export const ThemeSchema = SchemaFactory.createForClass(Theme);
