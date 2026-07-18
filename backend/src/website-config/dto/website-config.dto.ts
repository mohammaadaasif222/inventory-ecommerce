import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { ConfigSection } from '../entities/site-setting.entity';

export const CONFIG_SECTIONS: ConfigSection[] = [
  'general',
  'seo',
  'social',
  'scripts',
  'maintenance',
];

export class UpsertSettingDto {
  @ApiProperty({ example: 'store.name' })
  @IsString()
  @Length(1, 160)
  key: string;

  @ApiProperty({ description: 'Any JSON-serialisable value' })
  value: unknown;

  @ApiPropertyOptional({ enum: CONFIG_SECTIONS, default: 'general' })
  @IsOptional()
  @IsIn(CONFIG_SECTIONS)
  section?: ConfigSection;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class BulkUpsertDto {
  @ApiProperty({ type: [UpsertSettingDto] })
  settings: UpsertSettingDto[];
}
