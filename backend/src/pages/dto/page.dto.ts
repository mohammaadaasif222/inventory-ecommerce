import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PageSeoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogImage?: string;
}

export class CreatePageDto {
  @ApiProperty()
  @IsString()
  @Length(1, 255)
  title: string;

  @ApiPropertyOptional({ description: 'Defaults to a slug of the title' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  blocks?: { type: string; data: Record<string, unknown> }[];

  @ApiPropertyOptional({ type: PageSeoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageSeoDto)
  seo?: PageSeoDto;
}

export class UpdatePageDto extends PartialType(CreatePageDto) {}
