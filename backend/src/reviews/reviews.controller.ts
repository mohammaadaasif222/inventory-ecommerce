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
import { ReviewsService } from './reviews.service';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import {
  CreateReviewDto,
  ListReviewsQueryDto,
  UpdateReviewDto,
} from './dto/review.dto';

const STAFF: Role[] = [Role.ADMIN, Role.SUPER_ADMIN];

/** Reviews nested under a product: /api/products/:productId/reviews */
@ApiTags('reviews')
@Controller('products/:productId/reviews')
export class ProductReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get()
  @ResponseMessage('Reviews listed')
  list(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: ListReviewsQueryDto,
  ) {
    return this.reviews.listForProduct(productId, query);
  }

  @Public()
  @Get('summary')
  @ResponseMessage('Rating summary loaded')
  summary(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.reviews.summary(productId);
  }

  @ApiBearerAuth()
  @Get('mine')
  @ResponseMessage('Your review loaded')
  mine(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviews.mineForProduct(productId, userId);
  }

  @ApiBearerAuth()
  @Post()
  @ResponseMessage('Review submitted')
  create(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviews.create(productId, userId, dto);
  }
}

/** Owner/staff operations on an existing review: /api/reviews/:id */
@ApiTags('reviews')
@ApiBearerAuth()
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Patch(':id')
  @ResponseMessage('Review updated')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviews.update(id, userId, dto);
  }

  @Delete(':id')
  @ResponseMessage('Review deleted')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('roles') roles: Role[] = [],
  ) {
    await this.reviews.remove(
      id,
      userId,
      roles.some((r) => STAFF.includes(r)),
    );
    return { deleted: true };
  }
}
