import { ValueTransformer } from 'typeorm';

/**
 * Postgres numeric/decimal columns come back as strings from the driver.
 * This transformer keeps them as JS numbers on the entity.
 */
export class ColumnNumericTransformer implements ValueTransformer {
  to(value?: number | null): number | null {
    return value ?? null;
  }
  from(value?: string | null): number | null {
    if (value === null || value === undefined) return null;
    return parseFloat(value);
  }
}

export const numericTransformer = new ColumnNumericTransformer();
