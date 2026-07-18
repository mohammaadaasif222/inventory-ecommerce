import 'server-only';
import type { Metadata } from 'next';
import { config } from './config';
import { getActiveTheme } from './active-theme';
import { getThemeConfigSafe } from '@/themes/resolver';

/**
 * Server-side SEO metadata for storefront routes.
 *
 * Layering, most specific wins:
 *   1. admin overrides from the backend SEO module (`GET /seo/resolve`)
 *   2. the entity itself (product name/description/image, post title/excerpt)
 *   3. the active theme's name as the site suffix
 *
 * The page *bodies* hydrate client-side; this is the half crawlers rely on
 * regardless: title, description, canonical and OG tags rendered in the
 * server HTML. Metadata fetches tolerate a minute of staleness, so they use
 * ISR-style caching instead of hammering the API on every crawl.
 */

interface SeoMeta {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  canonicalUrl?: string;
  noindex?: boolean;
}

/** Envelope-unwrapping fetch; null on any failure — metadata must never 500 a page. */
async function fetchApi<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${config.apiUrl}${path}`, {
      headers: { accept: 'application/json' },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: T };
    return body?.data ?? null;
  } catch {
    return null;
  }
}

/** The shop's identity: theme name, plus the customiser's favicon if set. */
async function siteIdentity(): Promise<{ name: string; favicon: string | null }> {
  const active = await getActiveTheme();
  return {
    name: getThemeConfigSafe(active.slug).name,
    favicon: active.customizations.faviconUrl || null,
  };
}

async function siteName(): Promise<string> {
  return (await siteIdentity()).name;
}

async function adminOverrides(
  scope: 'product' | 'category' | 'page',
  entityId: string,
): Promise<SeoMeta | null> {
  return fetchApi<SeoMeta>(`/seo/resolve?scope=${scope}&entityId=${entityId}`);
}

/** Merge the layers into Next's Metadata shape. */
function build(
  site: string,
  entity: { title?: string; description?: string; image?: string },
  admin: SeoMeta | null,
): Metadata {
  const title = admin?.title || entity.title;
  const description = admin?.description || entity.description;
  const image = admin?.ogImage || entity.image;

  return {
    title: title ? `${title} — ${site}` : site,
    description: description || undefined,
    keywords: admin?.keywords?.length ? admin.keywords : undefined,
    alternates: admin?.canonicalUrl
      ? { canonical: admin.canonicalUrl }
      : undefined,
    robots: admin?.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: title || site,
      description: description || undefined,
      images: image ? [{ url: image }] : undefined,
      siteName: site,
    },
  };
}

// ── per-route builders ────────────────────────────────────────────────────

interface ProductForSeo {
  id: string;
  name: string;
  description: string | null;
  images: { url: string }[];
}

export async function productMetadata(slug: string): Promise<Metadata> {
  const [site, product] = await Promise.all([
    siteName(),
    fetchApi<ProductForSeo>(`/products/slug/${slug}`),
  ]);
  if (!product) return { title: site };

  const admin = await adminOverrides('product', product.id);
  return build(
    site,
    {
      title: product.name,
      // First sentence is enough for a snippet; whole descriptions overflow.
      description: product.description?.split(/(?<=\.)\s/)[0],
      image: product.images?.[0]?.url,
    },
    admin,
  );
}

interface ArticleForSeo {
  slug: string;
  title: string;
  excerpt: string;
}

export async function blogPostMetadata(slug: string): Promise<Metadata> {
  // The single-article endpoint increments the view counter, and a metadata
  // fetch is not a view — read the list (blocks-free, cached) instead.
  const [site, posts] = await Promise.all([
    siteName(),
    fetchApi<ArticleForSeo[]>('/knowledge-base/articles?kind=post'),
  ]);
  const post = posts?.find((p) => p.slug === slug);
  if (!post) return { title: `Journal — ${site}` };

  return build(site, { title: post.title, description: post.excerpt }, null);
}

export async function staticPageMetadata(
  title: string,
  description?: string,
): Promise<Metadata> {
  const site = await siteName();
  return build(site, { title, description }, null);
}

/** Home: the admin's global SEO defaults, with the theme name as fallback. */
export async function homeMetadata(): Promise<Metadata> {
  const [site, global] = await Promise.all([
    siteName(),
    fetchApi<SeoMeta>('/seo/global'),
  ]);
  return build(site, {}, global);
}

/**
 * For the storefront *layout*: the shop's name as the default title and the
 * customiser's favicon. Icons cascade to every page beneath, so the merchant's
 * favicon applies storefront-wide from this single export; pages only override
 * titles and descriptions.
 */
export async function storefrontLayoutMetadata(): Promise<Metadata> {
  const { name, favicon } = await siteIdentity();
  return {
    title: name,
    icons: favicon ? { icon: favicon } : undefined,
  };
}

/**
 * For pages that are personal or infinite (cart, checkout, account, search):
 * indexed versions of these are clutter at best and a privacy smell at worst.
 */
export async function privateMetadata(title: string): Promise<Metadata> {
  const site = await siteName();
  return {
    title: `${title} — ${site}`,
    robots: { index: false, follow: false },
  };
}
