import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { Public } from '../common/decorators/public.decorator';
import { OptionalAuth } from '../common/decorators/optional-auth.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { Audit } from '../admin/decorators/audit.decorator';
import { PaymentProvider } from './enums/payment.enum';
import { InitiatePaymentDto, RefundDto } from './dto/payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** Optional auth: guests authorise with the order's `guestToken` instead. */
  @ApiBearerAuth()
  @OptionalAuth()
  @Post('initiate')
  @ResponseMessage('Payment initiated')
  initiate(
    @Body() dto: InitiatePaymentDto,
    @CurrentUser('id') userId: string | undefined,
  ) {
    return this.payments.initiate(dto, userId ?? null);
  }

  @ApiBearerAuth()
  @Get('order/:orderId')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ResponseMessage('Payments listed')
  byOrder(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.payments.listByOrder(orderId);
  }

  @ApiBearerAuth()
  @Post(':paymentId/refund')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Audit('PAYMENT_REFUNDED', 'Payment')
  @ResponseMessage('Refund processed')
  refund(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: RefundDto,
  ) {
    return this.payments.refund(paymentId, dto);
  }

  // ── webhooks (public; verified by signature) ──
  @Public()
  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('ok')
  stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.payments.handleWebhook(
      PaymentProvider.STRIPE,
      req.rawBody ?? Buffer.from(''),
      signature,
    );
  }

  @Public()
  @Post('webhook/razorpay')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('ok')
  razorpayWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.payments.handleWebhook(
      PaymentProvider.RAZORPAY,
      req.rawBody ?? Buffer.from(''),
      signature,
    );
  }
}
