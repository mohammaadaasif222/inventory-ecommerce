import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import {
  SeoMeta,
  SeoMetaDocument,
  SeoScope,
} from './schemas/seo-meta.schema';
import { ProductsService } from '../products/products.service';
import { CatalogService } from '../catalog/catalog.service';
import { PagesService } from '../pages/pages.service';
import { UpsertSeoDto } from './dto/seo.dto';

interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

@Injectable()
export class SeoService {
  constructor(
    @InjectModel(SeoMeta.name)
    private readonly meta: Model<SeoMetaDocument>,
    private readonly config: ConfigService,
    private readonly products: ProductsService,
    private readonly catalog: CatalogService,
    private readonly pages: PagesService,
  ) {}

  private get siteUrl(): string {
    return (
      this.config.get<string>('app.frontendUrl') ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
  }

  // ── config ──
  getGlobal(): Promise<SeoMeta | null> {
    return this.meta.findOne({ scope: 'global', entityId: null }).lean();
  }

  list(): Promise<SeoMeta[]> {
    return this.meta.find().lean();
  }

  async upsert(dto: UpsertSeoDto): Promise<SeoMeta> {
    const entityId = dto.scope === 'global' ? null : (dto.entityId ?? null);
    return this.meta
      .findOneAndUpdate(
        { scope: dto.scope, entityId },
        { ...dto, entityId },
        { upsert: true, new: true },
      )
      .lean();
  }

  /** Per-entity meta merged over global defaults. */
  async resolve(scope: SeoScope, entityId: string): Promise<SeoMeta | null> {
    const [global, specific] = await Promise.all([
      this.getGlobal(),
      this.meta.findOne({ scope, entityId }).lean(),
    ]);
    if (!global && !specific) return null;
    return { ...(global ?? {}), ...(specific ?? {}) } as SeoMeta;
  }

  // ── sitemap.xml ──
  async buildSitemap(): Promise<string> {
    const base = this.siteUrl;
    const entries: SitemapEntry[] = [
      { loc: `${base}/` },
      { loc: `${base}/products` },
      { loc: `${base}/help` },
    ];

    const [products, categories, pages] = await Promise.all([
      this.products.activeSlugs().catch(() => []),
      this.catalog.activeCategorySlugs().catch(() => []),
      this.pages.publishedSlugs().catch(() => []),
    ]);

    for (const p of products) {
      entries.push({
        loc: `${base}/products/${p.slug}`,
        lastmod: p.updatedAt?.toISOString(),
      });
    }
    for (const c of categories) {
      entries.push({ loc: `${base}/products?category=${c.slug}` });
    }
    for (const pg of pages) {
      entries.push({
        loc: `${base}/${pg.slug}`,
        lastmod: pg.updatedAt
          ? new Date(pg.updatedAt).toISOString()
          : undefined,
      });
    }

    const urls = entries
      .map(
        (e) =>
          `  <url><loc>${escapeXml(e.loc)}</loc>${
            e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''
          }</url>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
  }

  // ── robots.txt ──
  async buildRobots(): Promise<string> {
    const global = await this.getGlobal();
    const disallowAll = global?.noindex === true;
    const lines = ['User-agent: *'];
    if (disallowAll) {
      lines.push('Disallow: /');
    } else {
      lines.push('Disallow: /admin');
      lines.push('Disallow: /api');
      lines.push('Allow: /');
    }
    lines.push(`Sitemap: ${this.siteUrl}/sitemap.xml`);
    return lines.join('\n');
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
