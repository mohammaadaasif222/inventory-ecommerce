import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { Public } from '../common/decorators/public.decorator';
import { OptionalAuth } from '../common/decorators/optional-auth.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { Audit } from '../admin/decorators/audit.decorator';
import {
  CreateCouponDto,
  ListCouponsQueryDto,
  UpdateCouponDto,
  ValidateCouponDto,
} from './dto/coupon.dto';

const ADMIN = [Role.ADMIN, Role.SUPER_ADMIN];

@ApiTags('coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  /** Offers strip on the storefront — code + terms only, no counters. */
  @Public()
  @Get('offers')
  @ResponseMessage('Offers loaded')
  async offers() {
    const list = await this.coupons.activeOffers();
    return list.map((c) => ({
      code: c.code,
      description: c.description,
      type: c.type,
      value: c.value,
      minSpend: c.minSpend,
      maxDiscount: c.maxDiscount,
      expiresAt: c.expiresAt,
    }));
  }

  /**
   * Preview the discount for a cart before checkout.
   *
   * Optional auth for guest carts: anonymous requests can quote coupons, but
   * `quote()` refuses per-customer-limited codes without a user.
   */
  @ApiBearerAuth()
  @OptionalAuth()
  @Post('validate')
  @ResponseMessage('Coupon applied')
  async validate(
    @Body() dto: ValidateCouponDto,
    @CurrentUser('id') userId: string | undefined,
  ) {
    const { coupon, discount } = await this.coupons.quote(
      dto.code,
      dto.subtotal,
      dto.shippingTotal ?? 0,
      userId ?? null,
    );
    return {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description,
      discount,
    };
  }

  // ── admin ──
  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Get()
  @ResponseMessage('Coupons listed')
  list(@Query() query: ListCouponsQueryDto) {
    return this.coupons.list(query);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Get(':id')
  byId(@Param('id', ParseUUIDPipe) id: string) {
    return this.coupons.findOne(id);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Post()
  @Audit('COUPON_CREATED', 'Coupon')
  @ResponseMessage('Coupon created')
  create(@Body() dto: CreateCouponDto) {
    return this.coupons.create(dto);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Patch(':id')
  @Audit('COUPON_UPDATED', 'Coupon')
  @ResponseMessage('Coupon updated')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.coupons.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Delete(':id')
  @Audit('COUPON_DELETED', 'Coupon')
  @ResponseMessage('Coupon deleted')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.coupons.remove(id);
    return { deleted: true };
  }
}
