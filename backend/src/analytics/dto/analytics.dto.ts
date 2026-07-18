import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional } from 'class-validator';

export type Granularity = 'day' | 'week' | 'month';

export class PeriodQueryDto {
  @ApiPropertyOptional({ description: 'ISO start date (default: 30 days ago)' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO end date (default: now)' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ enum: ['day', 'week', 'month'], default: 'day' })
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  granularity?: Granularity;

  /** Resolved [from, to] with sensible defaults. */
  range(): { from: Date; to: Date } {
    const to = this.to ? new Date(this.to) : new Date();
    const from = this.from
      ? new Date(this.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from, to };
  }
}
