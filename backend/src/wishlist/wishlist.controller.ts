import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('wishlist')
@ApiBearerAuth()
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Get()
  @ResponseMessage('Wishlist loaded')
  list(@CurrentUser('id') userId: string) {
    return this.wishlist.list(userId);
  }

  @Get('ids')
  @ResponseMessage('Wishlist ids loaded')
  ids(@CurrentUser('id') userId: string) {
    return this.wishlist.listProductIds(userId);
  }

  @Post(':productId/toggle')
  @ResponseMessage('Wishlist updated')
  toggle(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.wishlist.toggle(userId, productId);
  }

  @Post(':productId')
  @ResponseMessage('Added to wishlist')
  add(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.wishlist.add(userId, productId);
  }

  @Delete(':productId')
  @ResponseMessage('Removed from wishlist')
  remove(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.wishlist.remove(userId, productId);
  }
}
