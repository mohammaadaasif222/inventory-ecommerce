import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { StockMovementType } from '../enums/stock-movement-type.enum';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreateWarehouseDto {
  @ApiProperty()
  @IsString()
  @Length(1, 160)
  name: string;

  @ApiProperty()
  @IsString()
  @Length(1, 40)
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class AdjustStockDto {
  @ApiProperty()
  @IsString()
  sku: string;

  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty({
    enum: [
      StockMovementType.INBOUND,
      StockMovementType.OUTBOUND,
      StockMovementType.ADJUSTMENT,
    ],
  })
  @IsEnum(StockMovementType)
  type: StockMovementType;

  @ApiProperty({ description: 'Positive magnitude; sign derived from type' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class TransferStockDto {
  @ApiProperty()
  @IsString()
  sku: string;

  @ApiProperty()
  @IsUUID()
  fromWarehouseId: string;

  @ApiProperty()
  @IsUUID()
  toWarehouseId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SetThresholdDto {
  @ApiProperty()
  @IsString()
  sku: string;

  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  lowStockThreshold: number;
}

export class ListStockQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ description: 'Only items at/below threshold' })
  @IsOptional()
  @IsBoolean()
  lowOnly?: boolean;
}

export class ListMovementsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ enum: StockMovementType })
  @IsOptional()
  @IsEnum(StockMovementType)
  type?: StockMovementType;
}
