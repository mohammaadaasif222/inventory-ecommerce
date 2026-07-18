import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CartsService } from './carts.service';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { ListAbandonedCartsQueryDto, SyncCartDto } from './dto/cart.dto';

const ADMIN = [Role.ADMIN, Role.SUPER_ADMIN];

@ApiTags('carts')
@ApiBearerAuth()
@Controller('carts')
export class CartsController {
  constructor(private readonly carts: CartsService) {}

  /** Mirror the browser cart server-side (debounced by the client). */
  @Post('sync')
  @ResponseMessage('Cart synced')
  sync(@Body() dto: SyncCartDto, @CurrentUser('id') userId: string) {
    return this.carts.sync(userId, dto);
  }

  @Get('mine')
  @ResponseMessage('Cart loaded')
  mine(@CurrentUser('id') userId: string) {
    return this.carts.mine(userId);
  }

  @Delete('mine')
  @ResponseMessage('Cart cleared')
  async clear(@CurrentUser('id') userId: string) {
    await this.carts.markConverted(userId);
    return { cleared: true };
  }

  // ── admin ──
  @Roles(...ADMIN)
  @Get('abandoned')
  @ResponseMessage('Abandoned carts listed')
  listAbandoned(@Query() query: ListAbandonedCartsQueryDto) {
    return this.carts.listAbandoned(query);
  }

  @Roles(...ADMIN)
  @Get('stats')
  @ResponseMessage('Cart stats loaded')
  stats() {
    return this.carts.stats();
  }
}
