import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PopupType } from '../schemas/popup.schema';

export class DisplayRulesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  delaySeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  scrollPercent?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pageTargets?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  frequencyCap?: number;
}

export class CreatePopupDto {
  @ApiProperty({ enum: PopupType })
  @IsEnum(PopupType)
  type: PopupType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @ApiPropertyOptional({ type: DisplayRulesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DisplayRulesDto)
  displayRules?: DisplayRulesDto;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePopupDto extends PartialType(CreatePopupDto) {}
