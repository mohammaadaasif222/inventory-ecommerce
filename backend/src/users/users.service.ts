import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpStatus } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Address } from './entities/address.entity';
import { Role } from '../common/enums/role.enum';
import { AuthProvider, UserStatus } from './enums/user-status.enum';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';
import { PublicUser, toPublicUser } from './user.mapper';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  AssignRolesDto,
  ListUsersQueryDto,
} from './dto/admin-user.dto';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { ResponseMeta } from '../common/interfaces/api-response.interface';

interface CreateLocalUserInput {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roles?: Role[];
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Address)
    private readonly addresses: Repository<Address>,
  ) {}

  // ── lookups (used by AuthModule) ────────────────────────────────────────
  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email: email.toLowerCase() } });
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.users.findOne({ where: { googleId } });
  }

  async findEntityById(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) {
      throw new AppException(
        ErrorCode.USER_NOT_FOUND,
        'User not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return user;
  }

  async findById(id: string): Promise<PublicUser> {
    return toPublicUser(await this.findEntityById(id));
  }

  // ── creation ────────────────────────────────────────────────────────────
  async createLocal(input: CreateLocalUserInput): Promise<User> {
    const existing = await this.findByEmail(input.email);
    if (existing) {
      throw new AppException(
        ErrorCode.EMAIL_ALREADY_EXISTS,
        'An account with this email already exists',
        HttpStatus.CONFLICT,
      );
    }
    const user = this.users.create({
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      phone: input.phone ?? null,
      roles: input.roles ?? [Role.CUSTOMER],
      provider: AuthProvider.LOCAL,
      status: UserStatus.ACTIVE,
    });
    return this.users.save(user);
  }

  async createFromGoogle(input: {
    email: string;
    googleId: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  }): Promise<User> {
    const user = this.users.create({
      email: input.email.toLowerCase(),
      googleId: input.googleId,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      avatarUrl: input.avatarUrl ?? null,
      provider: AuthProvider.GOOGLE,
      emailVerified: true,
      roles: [Role.CUSTOMER],
      status: UserStatus.ACTIVE,
    });
    return this.users.save(user);
  }

  // ── auth state mutators ─────────────────────────────────────────────────
  async setRefreshTokenHash(
    userId: string,
    hash: string | null,
  ): Promise<void> {
    await this.users.update({ id: userId }, { refreshTokenHash: hash });
  }

  async setOtp(
    userId: string,
    otpHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.users.update({ id: userId }, { otpHash, otpExpiresAt: expiresAt });
  }

  async clearOtp(userId: string): Promise<void> {
    await this.users.update(
      { id: userId },
      { otpHash: null, otpExpiresAt: null, emailVerified: true },
    );
  }

  // ── profile ─────────────────────────────────────────────────────────────
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<PublicUser> {
    const user = await this.findEntityById(userId);
    Object.assign(user, dto);
    return toPublicUser(await this.users.save(user));
  }

  async updateAvatar(
    userId: string,
    avatarUrl: string,
    storageId: string,
  ): Promise<PublicUser> {
    const user = await this.findEntityById(userId);
    user.avatarUrl = avatarUrl;
    user.avatarStorageId = storageId;
    return toPublicUser(await this.users.save(user));
  }

  // ── address book ─────────────────────────────────────────────────────────
  async listAddresses(userId: string): Promise<Address[]> {
    return this.addresses.find({
      where: { user: { id: userId } },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async addAddress(userId: string, dto: CreateAddressDto): Promise<Address> {
    const user = await this.findEntityById(userId);
    if (dto.isDefault) await this.unsetDefaultAddresses(userId);
    const address = this.addresses.create({ ...dto, user });
    return this.addresses.save(address);
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<Address> {
    const address = await this.getOwnedAddress(userId, addressId);
    if (dto.isDefault) await this.unsetDefaultAddresses(userId);
    Object.assign(address, dto);
    return this.addresses.save(address);
  }

  async removeAddress(userId: string, addressId: string): Promise<void> {
    const address = await this.getOwnedAddress(userId, addressId);
    await this.addresses.remove(address);
  }

  private async getOwnedAddress(
    userId: string,
    addressId: string,
  ): Promise<Address> {
    const address = await this.addresses.findOne({
      where: { id: addressId, user: { id: userId } },
    });
    if (!address) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Address not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return address;
  }

  private async unsetDefaultAddresses(userId: string): Promise<void> {
    await this.addresses.update(
      { user: { id: userId }, isDefault: true },
      { isDefault: false },
    );
  }

  // ── admin ops ─────────────────────────────────────────────────────────────
  async listUsers(
    query: ListUsersQueryDto,
  ): Promise<{ data: PublicUser[]; meta: ResponseMeta }> {
    const qb = this.users.createQueryBuilder('user');
    if (query.status) qb.andWhere('user.status = :status', { status: query.status });
    if (query.role) qb.andWhere(':role = ANY(user.roles)', { role: query.role });
    if (query.search) {
      qb.andWhere(
        '(user.email ILIKE :s OR user.firstName ILIKE :s OR user.lastName ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }
    qb.orderBy('user.createdAt', 'DESC').skip(query.skip).take(query.limit);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map(toPublicUser),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async banUser(userId: string): Promise<PublicUser> {
    const user = await this.findEntityById(userId);
    user.status = UserStatus.BANNED;
    user.refreshTokenHash = null; // force logout
    return toPublicUser(await this.users.save(user));
  }

  async unbanUser(userId: string): Promise<PublicUser> {
    const user = await this.findEntityById(userId);
    user.status = UserStatus.ACTIVE;
    return toPublicUser(await this.users.save(user));
  }

  async assignRoles(userId: string, dto: AssignRolesDto): Promise<PublicUser> {
    const user = await this.findEntityById(userId);
    user.roles = dto.roles;
    return toPublicUser(await this.users.save(user));
  }
}
