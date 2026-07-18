import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SectionType } from '../schemas/homepage-section.schema';

export class CreateSectionDto {
  @ApiProperty({ enum: SectionType })
  @IsEnum(SectionType)
  type: SectionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    description: 'Theme slug this section is scoped to; empty/absent = all themes',
  })
  @IsOptional()
  @IsString()
  theme?: string;
}

export class UpdateSectionDto extends PartialType(CreateSectionDto) {}

export class ReorderDto {
  @ApiProperty({ type: [String], description: 'Section ids in display order' })
  @IsArray()
  @IsString({ each: true })
  orderedIds: string[];
}
