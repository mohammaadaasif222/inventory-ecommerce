import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { User } from '../users/entities/user.entity';
import { ReviewsService } from './reviews.service';
import {
  ProductReviewsController,
  ReviewsController,
} from './reviews.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Product, Order, OrderItem, User])],
  controllers: [ProductReviewsController, ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
