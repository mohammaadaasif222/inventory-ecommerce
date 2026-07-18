import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Coupon } from './entities/coupon.entity';
import { CouponRedemption } from './entities/coupon-redemption.entity';
import { CouponType } from './enums/coupon.enum';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';
import { ResponseMeta } from '../common/interfaces/api-response.interface';
import {
  CreateCouponDto,
  ListCouponsQueryDto,
  UpdateCouponDto,
} from './dto/coupon.dto';

export interface CouponQuote {
  coupon: Coupon;
  /** Amount to subtract from the order, already rounded and capped. */
  discount: number;
}

/** Money is stored to 2dp; keep every computed discount on that grid. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly coupons: Repository<Coupon>,
    @InjectRepository(CouponRedemption)
    private readonly redemptions: Repository<CouponRedemption>,
  ) {}

  // ── admin CRUD ──
  async create(dto: CreateCouponDto): Promise<Coupon> {
    const code = this.normalise(dto.code);
    const existing = await this.coupons.findOne({ where: { code } });
    if (existing) {
      throw new AppException(
        ErrorCode.COUPON_ALREADY_EXISTS,
        `Coupon ${code} already exists`,
        HttpStatus.CONFLICT,
      );
    }
    return this.coupons.save(
      this.coupons.create({
        ...dto,
        code,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      }),
    );
  }

  async list(
    query: ListCouponsQueryDto,
  ): Promise<{ data: Coupon[]; meta: ResponseMeta }> {
    const qb = this.coupons.createQueryBuilder('c');
    if (query.isActive !== undefined)
      qb.andWhere('c.isActive = :active', { active: query.isActive });
    if (query.search)
      qb.andWhere('c.code ILIKE :s', { s: `%${query.search}%` });
    qb.orderBy('c.createdAt', 'DESC').skip(query.skip).take(query.limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /** Coupons safe to advertise on the storefront: live, public, still usable. */
  activeOffers(): Promise<Coupon[]> {
    const now = new Date();
    return this.coupons
      .createQueryBuilder('c')
      .where('c.isActive = true')
      .andWhere('(c.startsAt IS NULL OR c.startsAt <= :now)', { now })
      .andWhere('(c.expiresAt IS NULL OR c.expiresAt > :now)', { now })
      .andWhere('(c.maxUses IS NULL OR c.usedCount < c.maxUses)')
      .orderBy('c.minSpend', 'ASC')
      .take(6)
      .getMany();
  }

  async findOne(id: string): Promise<Coupon> {
    const coupon = await this.coupons.findOne({ where: { id } });
    if (!coupon) {
      throw new AppException(
        ErrorCode.COUPON_NOT_FOUND,
        `Coupon ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.findOne(id);
    Object.assign(coupon, {
      ...dto,
      code: dto.code ? this.normalise(dto.code) : coupon.code,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : coupon.startsAt,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : coupon.expiresAt,
    });
    return this.coupons.save(coupon);
  }

  async remove(id: string): Promise<void> {
    await this.coupons.remove(await this.findOne(id));
  }

  // ── validation ──
  /**
   * Resolves a code to the discount it would grant. Throws with a specific
   * error code for every rejection so the UI can explain *why* a code failed.
   * This is the only place a discount is computed — never trust a client total.
   */
  async quote(
    code: string,
    subtotal: number,
    shippingTotal: number,
    /** Null for guest checkout — see the per-user-limit rule below. */
    userId: string | null,
    manager?: EntityManager,
  ): Promise<CouponQuote> {
    const repo = manager ? manager.getRepository(Coupon) : this.coupons;
    const normalised = this.normalise(code);
    const coupon = await repo.findOne({ where: { code: normalised } });

    if (!coupon || !coupon.isActive) {
      throw new AppException(
        ErrorCode.COUPON_INVALID,
        `Coupon ${normalised} is not valid`,
        HttpStatus.NOT_FOUND,
      );
    }

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      throw new AppException(
        ErrorCode.COUPON_NOT_STARTED,
        'This coupon is not active yet',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (coupon.expiresAt && coupon.expiresAt <= now) {
      throw new AppException(
        ErrorCode.COUPON_EXPIRED,
        'This coupon has expired',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new AppException(
        ErrorCode.COUPON_EXHAUSTED,
        'This coupon has been fully redeemed',
        HttpStatus.CONFLICT,
      );
    }
    if (subtotal < coupon.minSpend) {
      throw new AppException(
        ErrorCode.COUPON_MIN_SPEND_NOT_MET,
        `Spend at least ${coupon.minSpend} to use this coupon`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (coupon.perUserLimit !== null) {
      // A per-user cap is unenforceable for an anonymous cart: a guest could
      // redeem "once per customer" endlessly by re-checking-out. Refusing is
      // the only honest option — the message tells them the way through.
      if (!userId) {
        throw new AppException(
          ErrorCode.COUPON_INVALID,
          'Sign in to use this coupon — it is limited per customer',
          HttpStatus.BAD_REQUEST,
        );
      }
      const redemptionRepo = manager
        ? manager.getRepository(CouponRedemption)
        : this.redemptions;
      const used = await redemptionRepo.count({
        where: { couponId: coupon.id, userId },
      });
      if (used >= coupon.perUserLimit) {
        throw new AppException(
          ErrorCode.COUPON_USER_LIMIT_REACHED,
          'You have already used this coupon',
          HttpStatus.CONFLICT,
        );
      }
    }

    return { coupon, discount: this.computeDiscount(coupon, subtotal, shippingTotal) };
  }

  /** Discount never exceeds what it applies to, so totals can't go negative. */
  private computeDiscount(
    coupon: Coupon,
    subtotal: number,
    shippingTotal: number,
  ): number {
    switch (coupon.type) {
      case CouponType.PERCENT: {
        const raw = (subtotal * coupon.value) / 100;
        const capped =
          coupon.maxDiscount !== null
            ? Math.min(raw, coupon.maxDiscount)
            : raw;
        return round2(Math.min(capped, subtotal));
      }
      case CouponType.FIXED:
        return round2(Math.min(coupon.value, subtotal));
      case CouponType.FREE_SHIPPING:
        return round2(shippingTotal);
      default:
        return 0;
    }
  }

  /**
   * Records a redemption and bumps the counter. Must run inside the order's
   * transaction so a failed order can't burn a use.
   */
  async redeem(
    manager: EntityManager,
    couponId: string,
    userId: string | null,
    orderId: string,
    discountAmount: number,
  ): Promise<void> {
    await manager.increment(Coupon, { id: couponId }, 'usedCount', 1);
    await manager.save(
      manager.create(CouponRedemption, {
        couponId,
        userId,
        orderId,
        discountAmount,
      }),
    );
  }

  private normalise(code: string): string {
    return code.trim().toUpperCase();
  }
}
