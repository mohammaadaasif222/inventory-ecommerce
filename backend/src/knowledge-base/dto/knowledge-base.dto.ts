import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { ArticleKind } from '../schemas/article.schema';

export class ContentBlockDto {
  @ApiProperty({ example: 'paragraph' })
  @IsString()
  type: string;

  @ApiProperty({ type: Object })
  data: Record<string, unknown>;
}

export class CreateArticleDto {
  @ApiProperty()
  @IsString()
  @Length(1, 255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiPropertyOptional({ type: [ContentBlockDto] })
  @IsOptional()
  @IsArray()
  blocks?: ContentBlockDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  /** `help` (support centre) or `post` (storefront journal). */
  @ApiPropertyOptional({ enum: ArticleKind, default: ArticleKind.HELP })
  @IsOptional()
  @IsEnum(ArticleKind)
  kind?: ArticleKind;
}

export class UpdateArticleDto extends PartialType(CreateArticleDto) {}

export class CreateKbCategoryDto {
  @ApiProperty()
  @IsString()
  @Length(1, 160)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class VoteDto {
  @ApiProperty({ description: 'true = helpful, false = not helpful' })
  @IsBoolean()
  helpful: boolean;
}
