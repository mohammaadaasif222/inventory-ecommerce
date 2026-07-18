import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { OptionalAuth } from '../common/decorators/optional-auth.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { Audit } from '../admin/decorators/audit.decorator';
import {
  CreateOrderDto,
  FulfillOrderDto,
  ListOrdersQueryDto,
  UpdateOrderStatusDto,
} from './dto/order.dto';

const STAFF = [Role.ADMIN, Role.SUPER_ADMIN];

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // ── customer ──
  /**
   * Optional auth is the guest-checkout switch: with a token the order binds
   * to the account, without one it binds to `dto.guestEmail` and the response
   * carries a `guestToken` — the caller's only key to the order afterwards.
   */
  @OptionalAuth()
  @Post()
  @ApiOperation({ summary: 'Place an order (signed-in or guest)' })
  @ResponseMessage('Order placed')
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser('id') userId: string | undefined,
  ) {
    return this.orders.create(dto, userId ?? null);
  }

  /**
   * A guest's own order, token-gated.
   *
   * `guest/` sits before the `:id` routes so Nest never mistakes the literal
   * for a UUID. Public by design — the token *is* the credential.
   */
  @Public()
  @Get('guest/:id')
  @ApiOperation({ summary: "A guest order, authorised by its creation token" })
  @ResponseMessage('Order found')
  guestOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token: string,
  ) {
    return this.orders.findGuestOrder(id, token ?? '');
  }

  @Get('mine')
  @ResponseMessage('Your orders')
  mine(@Query() query: ListOrdersQueryDto, @CurrentUser('id') userId: string) {
    return this.orders.list(query, userId);
  }

  @Get('mine/:id')
  myOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.orders.findOne(id, userId);
  }

  // ── staff ──
  @Get()
  @Roles(...STAFF)
  @ResponseMessage('Orders listed')
  list(@Query() query: ListOrdersQueryDto) {
    return this.orders.list(query);
  }

  @Get(':id')
  @Roles(...STAFF)
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.findOne(id);
  }

  @Patch(':id/status')
  @Roles(...STAFF)
  @Audit('ORDER_STATUS_CHANGED', 'Order')
  @ResponseMessage('Order status updated')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orders.updateStatus(id, dto.status);
  }

  @Post(':id/fulfill')
  @Roles(...STAFF)
  @Audit('ORDER_FULFILLED', 'Order')
  @ResponseMessage('Order fulfillment recorded')
  fulfill(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FulfillOrderDto,
  ) {
    return this.orders.fulfill(id, dto);
  }
}
