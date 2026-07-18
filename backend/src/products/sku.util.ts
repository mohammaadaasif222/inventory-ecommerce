/**
 * Deterministic-ish SKU generator: PREFIX-ATTR1-ATTR2-XXXX
 * e.g. "TSHIRT-M-RED-8F3A". Uniqueness is enforced by the DB unique index;
 * the service retries on collision.
 */
export function generateSku(
  productName: string,
  attributes: Record<string, string> = {},
): string {
  const prefix = productName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 8) || 'PROD';

  const attrParts = Object.values(attributes)
    .map((v) =>
      v
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '')
        .slice(0, 4),
    )
    .filter(Boolean);

  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return [prefix, ...attrParts, rand].join('-');
}
