/** URL-safe slug from arbitrary text. */
export function slugify(input: string): string {
  return input
    .toString()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

/** Append a short random suffix to keep slugs unique. */
export function uniqueSlug(input: string, suffixLen = 4): string {
  const base = slugify(input);
  const suffix = Math.random().toString(36).slice(2, 2 + suffixLen);
  return `${base}-${suffix}`;
}
