import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

// ── Category ──
export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  @Length(1, 160)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Parent category id (for nesting)' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

// ── Brand ──
export class CreateBrandDto {
  @ApiProperty()
  @IsString()
  @Length(1, 160)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
export class UpdateBrandDto extends PartialType(CreateBrandDto) {}

// ── Tag ──
export class CreateTagDto {
  @ApiProperty()
  @IsString()
  @Length(1, 120)
  name: string;
}

// ── Attribute ──
export class CreateAttributeDto {
  @ApiProperty({ example: 'Size' })
  @IsString()
  @Length(1, 120)
  name: string;

  @ApiProperty({ example: ['S', 'M', 'L'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  values: string[];
}
export class UpdateAttributeDto extends PartialType(CreateAttributeDto) {}

// ── Collection ──
export class CreateCollectionDto {
  @ApiProperty()
  @IsString()
  @Length(1, 160)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  productIds?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
export class UpdateCollectionDto extends PartialType(CreateCollectionDto) {}
