import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CartLineDto {
  @ApiProperty()
  @IsString()
  @Length(1, 80)
  sku: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty()
  @IsString()
  @Length(1, 200)
  nameSnapshot: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

/** Whole-cart replace — the browser store is the source of truth. */
export class SyncCartDto {
  @ApiProperty({ type: [CartLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartLineDto)
  items: CartLineDto[];

  @ApiPropertyOptional({ default: 'INR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}

export class ListAbandonedCartsQueryDto extends PaginationQueryDto {}
