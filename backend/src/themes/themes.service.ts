import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisService } from '../redis/redis.service';
import { ThemeEvents } from './theme.events';
import {
  Theme,
  ThemeDocument,
  type ThemeCustomizations,
} from './schemas/theme.schema';
import {
  ThemeRevision,
  ThemeRevisionDocument,
  type RevisionReason,
} from './schemas/theme-revision.schema';
import {
  ActivateThemeDto,
  CustomizeThemeDto,
  SyncThemesDto,
  invalidColorTokens,
} from './dto/themes.dto';

/**
 * The storefront's view of the active theme. Small on purpose — it is read on
 * every storefront request, so it holds the slug and the merchant's overrides,
 * never the theme's own tokens (those live on disk with the package).
 */
export interface ActiveTheme {
  slug: string;
  customizations: ThemeCustomizations;
}

/**
 * Cache key for the active theme.
 *
 * A single key rather than one per field: a switch invalidates the whole
 * concept at once, and a partial invalidation would let a storefront render a
 * new theme with the previous theme's logo.
 */
const ACTIVE_KEY = 'theme:active';

/**
 * Long TTL because every write path invalidates explicitly. The expiry is a
 * backstop against a missed invalidation leaving a store stuck on an old
 * theme forever, not the primary refresh mechanism.
 */
const ACTIVE_TTL = 3600;

/** Used when the database has no active theme — must be an installed package. */
const FALLBACK_SLUG = 'universal';

@Injectable()
export class ThemesService {
  private readonly logger = new Logger(ThemesService.name);

  constructor(
    @InjectModel(Theme.name)
    private readonly themes: Model<ThemeDocument>,
    @InjectModel(ThemeRevision.name)
    private readonly revisions: Model<ThemeRevisionDocument>,
    private readonly redis: RedisService,
    private readonly events: ThemeEvents,
  ) {}

  // ── Registry ────────────────────────────────────────────────────────────

  /**
   * Reconcile the collection with the packages on disk.
   *
   * Upserts identity fields only — never `active` or `customizations`, or a
   * sync would silently discard a merchant's work. Packages that vanish are
   * marked `installed: false` rather than deleted, so re-adding the directory
   * restores their customisations intact.
   */
  async sync(dto: SyncThemesDto): Promise<Theme[]> {
    const seen = dto.themes.map((t) => t.slug);

    for (const t of dto.themes) {
      await this.themes.updateOne(
        { slug: t.slug },
        {
          $set: {
            name: t.name,
            version: t.version,
            description: t.description ?? '',
            extends: t.extends ?? null,
            installed: true,
          },
          $setOnInsert: { slug: t.slug, active: false, customizations: {} },
        },
        { upsert: true },
      );
    }

    const removed = await this.themes.updateMany(
      { slug: { $nin: seen } },
      { $set: { installed: false } },
    );
    if (removed.modifiedCount > 0) {
      this.logger.warn(
        `${removed.modifiedCount} theme(s) no longer on disk; marked uninstalled.`,
      );
    }

    // A store with no active theme (first boot) needs one, or every storefront
    // request falls back and the admin's manager shows nothing as active.
    await this.ensureActive(seen);

    return this.list();
  }

  /** Pick an active theme when none is set, preferring the fallback package. */
  private async ensureActive(available: string[]): Promise<void> {
    if (available.length === 0) return;
    const active = await this.themes.findOne({ active: true, installed: true }).lean();
    if (active) return;

    const slug = available.includes(FALLBACK_SLUG) ? FALLBACK_SLUG : available[0];
    await this.themes.updateOne({ slug }, { $set: { active: true } });
    await this.invalidate();
    this.logger.log(`No active theme; defaulted to "${slug}".`);
  }

  async list(): Promise<Theme[]> {
    return this.themes.find({ installed: true }).sort({ name: 1 }).lean();
  }

  async findOne(slug: string): Promise<Theme> {
    const theme = await this.themes.findOne({ slug }).lean();
    if (!theme) throw new NotFoundException(`Theme "${slug}" is not installed`);
    return theme;
  }

  // ── Active theme ────────────────────────────────────────────────────────

  /**
   * The active theme, Redis-first.
   *
   * This is the hot path — every storefront render calls it — so a cache miss
   * writes through rather than leaving the next request to repeat the query.
   */
  async getActive(): Promise<ActiveTheme> {
    const cached = await this.redis.getJson<ActiveTheme>(ACTIVE_KEY);
    if (cached) return cached;

    const doc = await this.themes.findOne({ active: true, installed: true }).lean();
    const state: ActiveTheme = doc
      ? { slug: doc.slug, customizations: doc.customizations ?? {} }
      : { slug: FALLBACK_SLUG, customizations: {} };

    if (!doc) {
      this.logger.warn(
        `No active theme in the database; serving "${FALLBACK_SLUG}". ` +
          `Run POST /themes/sync to register the installed packages.`,
      );
    }

    await this.redis.setJson(ACTIVE_KEY, state, ACTIVE_TTL);
    return state;
  }

  /**
   * Switch the storefront to `slug`.
   *
   * Snapshots the current state first so the switch is one click from
   * reversible, then flips the flag, drops the cache and announces it. No
   * rebuild is involved: the next storefront request reads the new slug and
   * the resolver renders that package's templates.
   */
  async activate(
    slug: string,
    dto: ActivateThemeDto,
    userId: string | null,
  ): Promise<ActiveTheme> {
    const target = await this.findOne(slug);
    if (!target.installed) {
      throw new BadRequestException(
        `Theme "${slug}" is registered but no longer on disk. Restore the ` +
          `package and run POST /themes/sync before activating it.`,
      );
    }

    await this.snapshot('activate', userId);

    // Carry the previewed draft into the publish, so what the admin approved is
    // exactly what goes live.
    if (dto.customizations) {
      this.assertValidColors(dto.customizations);
      await this.themes.updateOne(
        { slug },
        { $set: this.toSetOps(dto.customizations) },
      );
    }

    await this.themes.updateMany({ active: true }, { $set: { active: false } });
    await this.themes.updateOne({ slug }, { $set: { active: true } });

    const state = await this.refresh();
    this.events.emitThemeChanged(state);
    this.logger.log(`Theme activated: ${slug}`);
    return state;
  }

  /**
   * Persist customiser changes for a theme.
   *
   * Only broadcasts when the edited theme is the live one — customising an
   * inactive theme is preparation, and must not re-skin the storefront out
   * from under shoppers.
   */
  async customize(
    slug: string,
    dto: CustomizeThemeDto,
    userId: string | null,
  ): Promise<Theme> {
    await this.findOne(slug);
    this.assertValidColors(dto);
    await this.snapshot('customize', userId);

    const updated = await this.themes
      .findOneAndUpdate({ slug }, { $set: this.toSetOps(dto) }, { new: true })
      .lean();

    if (updated?.active) {
      const state = await this.refresh();
      this.events.emitThemeChanged(state);
    }

    return updated!;
  }

  /**
   * Undo the last activate or customise.
   *
   * Pops the newest unrestored snapshot and applies it — repeated clicks walk
   * further back through history. Deliberately does *not* snapshot before
   * restoring: doing so would make the next rollback a redo, and an undo button
   * that alternates between two states on repeated clicks is worse than no
   * undo at all.
   */
  async rollback(userId: string | null): Promise<ActiveTheme> {
    const head = await this.revisions
      .findOne({ restored: false })
      .sort({ createdAt: -1 })
      .lean();

    if (!head) {
      throw new BadRequestException(
        'Nothing to roll back to — no theme changes have been recorded yet.',
      );
    }

    await this.themes.updateOne(
      { slug: head.slug },
      { $set: { customizations: head.customizations ?? {} } },
    );
    await this.themes.updateMany({ active: true }, { $set: { active: false } });
    await this.themes.updateOne(
      { slug: head.activeSlug },
      { $set: { active: true } },
    );
    await this.revisions.updateOne({ _id: head._id }, { $set: { restored: true } });

    const state = await this.refresh();
    this.events.emitThemeChanged(state);
    this.logger.log(
      `Theme rolled back to "${head.activeSlug}" (revision ${String(head._id)}) by ${userId ?? 'system'}`,
    );
    return state;
  }

  /** Whether the admin's Revert button should be live. */
  async canRollback(): Promise<boolean> {
    return (await this.revisions.countDocuments({ restored: false })) > 0;
  }

  async history(limit = 20): Promise<ThemeRevision[]> {
    return this.revisions.find().sort({ createdAt: -1 }).limit(limit).lean();
  }

  // ── Internals ───────────────────────────────────────────────────────────

  /**
   * Record the state *before* a change, so the newest revision is always the
   * one to restore.
   */
  private async snapshot(
    reason: RevisionReason,
    userId: string | null,
  ): Promise<void> {
    const current = await this.themes.findOne({ active: true }).lean();
    if (!current) return;

    await this.revisions.create({
      slug: current.slug,
      activeSlug: current.slug,
      customizations: current.customizations ?? {},
      reason,
      userId,
      restored: false,
    });
  }

  /** Drop the cache and read through, returning the fresh state. */
  private async refresh(): Promise<ActiveTheme> {
    await this.invalidate();
    return this.getActive();
  }

  private async invalidate(): Promise<void> {
    await this.redis.del(ACTIVE_KEY);
  }

  /**
   * Flatten a patch into dotted `$set` paths.
   *
   * `{ colors: { light: { primary } } }` must become
   * `customizations.colors.light.primary`, not a whole-object `$set` — the
   * latter would drop every sibling token the admin did not just touch.
   */
  private toSetOps(dto: CustomizeThemeDto): Record<string, unknown> {
    const ops: Record<string, unknown> = {};

    for (const mode of ['light', 'dark'] as const) {
      for (const [token, value] of Object.entries(dto.colors?.[mode] ?? {})) {
        ops[`customizations.colors.${mode}.${token}`] = value;
      }
    }
    for (const [face, value] of Object.entries(dto.fonts ?? {})) {
      if (value) ops[`customizations.fonts.${face}`] = value;
    }
    if (dto.radius) ops['customizations.radius'] = dto.radius;
    if (dto.layoutPreset) ops['customizations.layoutPreset'] = dto.layoutPreset;
    if (dto.appearance) ops['customizations.appearance'] = dto.appearance;
    if (dto.logoUrl !== undefined) ops['customizations.logoUrl'] = dto.logoUrl;
    if (dto.faviconUrl !== undefined) {
      ops['customizations.faviconUrl'] = dto.faviconUrl;
    }
    // Replaced wholesale: a reorder is a complete statement of the new order.
    if (dto.sectionOrder) ops['customizations.sectionOrder'] = dto.sectionOrder;

    return ops;
  }

  /**
   * Reject malformed colours at the edge.
   *
   * An invalid CSS variable does not throw in the browser — it cascades to an
   * unstyled element — so a bad token saved here surfaces later as an
   * inexplicable visual bug. Failing the request keeps that impossible.
   */
  private assertValidColors(dto: CustomizeThemeDto): void {
    const bad = invalidColorTokens(dto.colors);
    if (bad.length > 0) {
      throw new BadRequestException(
        `Invalid colour token(s): ${bad.join(', ')}. Expected bare HSL like ` +
          `"36 46% 52%" (no hsl() wrapper, no hex).`,
      );
    }
  }
}
