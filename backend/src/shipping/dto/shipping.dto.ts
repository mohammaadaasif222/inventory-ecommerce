import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { RateType, ShipmentStatus } from '../enums/shipping.enum';

export class CreateZoneDto {
  @ApiProperty()
  @IsString()
  @Length(1, 160)
  name: string;

  @ApiProperty({ type: [String], example: ['IN', 'LK'] })
  @IsArray()
  @IsString({ each: true })
  countries: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
export class UpdateZoneDto extends PartialType(CreateZoneDto) {}

export class CreateMethodDto {
  @ApiProperty()
  @IsUUID()
  zoneId: string;

  @ApiProperty()
  @IsString()
  @Length(1, 160)
  name: string;

  @ApiPropertyOptional({ default: 'GENERIC' })
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiProperty({ enum: RateType })
  @IsEnum(RateType)
  rateType: RateType;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseRate?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  perKgRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeAbove?: number;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedDays?: number;
}
export class UpdateMethodDto extends PartialType(CreateMethodDto) {}

export class CalculateRatesDto {
  @ApiProperty({ example: 'IN' })
  @IsString()
  @Length(2, 2)
  country: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  weightGrams?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderTotal?: number;
}

export class CreateShipmentDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiProperty()
  @IsString()
  carrier: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingNumber?: string;
}

export class UpdateShipmentStatusDto {
  @ApiProperty({ enum: ShipmentStatus })
  @IsEnum(ShipmentStatus)
  status: ShipmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: 'Departed Mumbai sorting facility' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  note?: string;
}
