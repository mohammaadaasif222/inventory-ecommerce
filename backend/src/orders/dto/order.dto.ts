import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderStatus } from '../enums/order-status.enum';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class AddressSnapshotDto {
  @ApiProperty() @IsString() fullName: string;
  @ApiProperty() @IsString() phone: string;
  @ApiProperty() @IsString() line1: string;
  @ApiPropertyOptional() @IsOptional() @IsString() line2?: string;
  @ApiProperty() @IsString() city: string;
  @ApiProperty() @IsString() state: string;
  @ApiProperty() @IsString() postalCode: string;
  @ApiProperty() @IsString() @Length(2, 2) country: string;
}

export class OrderLineDto {
  @ApiProperty()
  @IsString()
  sku: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  items: OrderLineDto[];

  @ApiProperty({ type: AddressSnapshotDto })
  @ValidateNested()
  @Type(() => AddressSnapshotDto)
  shippingAddress: AddressSnapshotDto;

  @ApiPropertyOptional({ type: AddressSnapshotDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressSnapshotDto)
  billingAddress?: AddressSnapshotDto;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingTotal?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxTotal?: number;

  /**
   * Coupon code to apply. The discount is computed server-side from this —
   * a client-supplied discount amount is never trusted.
   */
  @ApiPropertyOptional({ example: 'WELCOME10' })
  @IsOptional()
  @IsString()
  @Length(3, 40)
  couponCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  /**
   * Required when placing the order without a session; forbidden noise
   * otherwise (an authenticated order's email is the account's). Where the
   * guest's confirmation and order link go.
   */
  @ApiPropertyOptional({ example: 'guest@example.com' })
  @IsOptional()
  @IsEmail()
  guestEmail?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

export class FulfillOrderDto {
  @ApiProperty({ type: [OrderLineDto], description: 'Quantities to fulfill now' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines: OrderLineDto[];
}

export class ListOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
