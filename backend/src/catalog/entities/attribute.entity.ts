import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Variant attribute definition, e.g. name="Size", code="size",
 * values=["S","M","L"]. Products pick attribute values per variant.
 */
@Entity('attributes')
export class Attribute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 120 })
  code: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  values: string[];
}
