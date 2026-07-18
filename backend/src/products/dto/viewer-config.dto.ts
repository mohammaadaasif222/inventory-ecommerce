import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type {
  ViewerBackground,
  ViewerType,
} from '../entities/viewer-config.entity';

const TYPES: ViewerType[] = ['3d', '360', 'static'];
const BACKGROUNDS: ViewerBackground[] = [
  'studio-light',
  'dark-luxury',
  'gradient',
  'transparent',
];

export class SaveViewerConfigDto {
  @ApiProperty({ enum: TYPES })
  @IsIn(TYPES)
  type: ViewerType;

  @ApiPropertyOptional({ description: '.glb/.gltf URL from the media library' })
  @IsOptional()
  @IsString()
  modelUrl?: string;

  @ApiPropertyOptional({ type: [String], description: 'Ordered 360° frames' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  autoRotate?: boolean;

  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10)
  rotateSpeed?: number;

  @ApiPropertyOptional({ enum: BACKGROUNDS, default: 'studio-light' })
  @IsOptional()
  @IsIn(BACKGROUNDS)
  background?: ViewerBackground;

  @ApiPropertyOptional({ default: 1.5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  minZoom?: number;

  @ApiPropertyOptional({ default: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxZoom?: number;

  @ApiPropertyOptional({ default: 2.2 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  defaultZoom?: number;
}
