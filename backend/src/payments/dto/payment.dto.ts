import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaymentProvider } from '../enums/payment.enum';

export class InitiatePaymentDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  /**
   * Authorises payment on a guest order in place of a session — the token the
   * order-creation response returned. Ignored for signed-in customers.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guestToken?: string;
}

export class RefundDto {
  @ApiPropertyOptional({ description: 'Partial amount; full refund if omitted' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
