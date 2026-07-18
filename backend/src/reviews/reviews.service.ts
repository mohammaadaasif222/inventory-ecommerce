import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { User } from '../users/entities/user.entity';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';
import { ResponseMeta } from '../common/interfaces/api-response.interface';
import {
  CreateReviewDto,
  ListReviewsQueryDto,
  ReviewSort,
  UpdateReviewDto,
} from './dto/review.dto';

/** A review joined with its author's public display fields. */
export interface ReviewWithAuthor extends Review {
  authorName: string;
  authorAvatarUrl: string | null;
}

export interface RatingSummary {
  average: number;
  count: number;
  /** Review count per star bucket, keyed '1'–'5'. */
  distribution: Record<string, number>;
}

/** Only a delivered order proves the reviewer actually received the product. */
const VERIFIED_STATUSES: OrderStatus[] = [OrderStatus.DELIVERED];

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  // ── write ──
  async create(
    productId: string,
    userId: string,
    dto: CreateReviewDto,
  ): Promise<Review> {
    await this.assertProductExists(productId);

    const existing = await this.reviews.findOne({
      where: { productId, userId },
    });
    if (existing) {
      throw new AppException(
        ErrorCode.REVIEW_ALREADY_EXISTS,
        'You have already reviewed this product; edit your existing review instead.',
        HttpStatus.CONFLICT,
      );
    }

    const review = this.reviews.create({
      productId,
      userId,
      rating: dto.rating,
      title: dto.title ?? null,
      body: dto.body ?? null,
      isVerifiedPurchase: await this.hasPurchased(productId, userId),
    });
    const saved = await this.reviews.save(review);
    await this.recomputeAggregate(productId);
    return saved;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateReviewDto,
  ): Promise<Review> {
    const review = await this.findOwned(id, userId);
    if (dto.rating !== undefined) review.rating = dto.rating;
    if (dto.title !== undefined) review.title = dto.title ?? null;
    if (dto.body !== undefined) review.body = dto.body ?? null;

    const saved = await this.reviews.save(review);
    await this.recomputeAggregate(review.productId);
    return saved;
  }

  /** Staff may delete any review; customers only their own. */
  async remove(id: string, userId: string, isStaff: boolean): Promise<void> {
    const review = isStaff
      ? await this.findById(id)
      : await this.findOwned(id, userId);
    await this.reviews.remove(review);
    await this.recomputeAggregate(review.productId);
  }

  // ── read ──
  async listForProduct(
    productId: string,
    query: ListReviewsQueryDto,
  ): Promise<{ data: ReviewWithAuthor[]; meta: ResponseMeta }> {
    const qb = this.reviews
      .createQueryBuilder('r')
      .where('r.productId = :productId', { productId });

    if (query.rating) qb.andWhere('r.rating = :rating', { rating: query.rating });

    if (query.sort === ReviewSort.RATING_DESC) {
      qb.orderBy('r.rating', 'DESC').addOrderBy('r.createdAt', 'DESC');
    } else if (query.sort === ReviewSort.RATING_ASC) {
      qb.orderBy('r.rating', 'ASC').addOrderBy('r.createdAt', 'DESC');
    } else {
      qb.orderBy('r.createdAt', 'DESC');
    }

    qb.skip(query.skip).take(query.limit);
    const [rows, total] = await qb.getManyAndCount();

    return {
      data: await this.attachAuthors(rows),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async summary(productId: string): Promise<RatingSummary> {
    const rows = await this.reviews
      .createQueryBuilder('r')
      .select('r.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('r.productId = :productId', { productId })
      .groupBy('r.rating')
      .getRawMany<{ rating: number; count: string }>();

    const distribution: Record<string, number> = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };
    let total = 0;
    let weighted = 0;
    for (const row of rows) {
      const count = Number(row.count);
      distribution[String(row.rating)] = count;
      total += count;
      weighted += count * Number(row.rating);
    }

    return {
      average: total === 0 ? 0 : Number((weighted / total).toFixed(1)),
      count: total,
      distribution,
    };
  }

  /** The signed-in customer's own review, if any — drives edit vs. create UI. */
  mineForProduct(productId: string, userId: string): Promise<Review | null> {
    return this.reviews.findOne({ where: { productId, userId } });
  }

  // ── aggregate ──
  /**
   * Recomputes products.rating_average / rating_count from the reviews table.
   * Called after every review write so the denormalised columns the product
   * listing filters on stay in step with the source rows.
   */
  async recomputeAggregate(
    productId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(Review)
      : this.reviews;
    const products = manager
      ? manager.getRepository(Product)
      : this.products;

    const row = await repo
      .createQueryBuilder('r')
      .select('COALESCE(AVG(r.rating), 0)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('r.productId = :productId', { productId })
      .getRawOne<{ avg: string; count: string }>();

    await products.update(productId, {
      ratingAverage: Number(Number(row?.avg ?? 0).toFixed(1)),
      ratingCount: Number(row?.count ?? 0),
    });
  }

  // ── helpers ──
  private async attachAuthors(rows: Review[]): Promise<ReviewWithAuthor[]> {
    if (rows.length === 0) return [];
    const authors = await this.users.find({
      where: rows.map((r) => ({ id: r.userId })),
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
    });
    const byId = new Map(authors.map((u) => [u.id, u]));

    return rows.map((r) => {
      const author = byId.get(r.userId);
      const name = [author?.firstName, author?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
      return Object.assign(r, {
        authorName: name || 'Anonymous',
        authorAvatarUrl: author?.avatarUrl ?? null,
      });
    });
  }

  /** True when the user has a DELIVERED order containing this product. */
  private async hasPurchased(
    productId: string,
    userId: string,
  ): Promise<boolean> {
    const count = await this.orderItems
      .createQueryBuilder('oi')
      .innerJoin(Order, 'o', 'o.id = oi.orderId')
      .where('oi.productId = :productId', { productId })
      .andWhere('o.customerId = :userId', { userId })
      .andWhere('o.status IN (:...statuses)', { statuses: VERIFIED_STATUSES })
      .getCount();
    return count > 0;
  }

  private async assertProductExists(productId: string): Promise<void> {
    const exists = await this.products.exists({ where: { id: productId } });
    if (!exists) {
      throw new AppException(
        ErrorCode.PRODUCT_NOT_FOUND,
        `Product ${productId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async findById(id: string): Promise<Review> {
    const review = await this.reviews.findOne({ where: { id } });
    if (!review) {
      throw new AppException(
        ErrorCode.REVIEW_NOT_FOUND,
        `Review ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    return review;
  }

  private async findOwned(id: string, userId: string): Promise<Review> {
    const review = await this.findById(id);
    if (review.userId !== userId) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'You can only modify your own review',
        HttpStatus.FORBIDDEN,
      );
    }
    return review;
  }
}
