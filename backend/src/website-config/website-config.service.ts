import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteSetting, ConfigSection } from './entities/site-setting.entity';
import { RedisService } from '../redis/redis.service';
import { UpsertSettingDto } from './dto/website-config.dto';

const PUBLIC_CACHE_KEY = 'config:public';
const PUBLIC_CACHE_TTL = 300; // 5 minutes

/**
 * Key-value site configuration with a Redis-cached public projection consumed
 * by the storefront (GET /config/public).
 */
@Injectable()
export class WebsiteConfigService {
  constructor(
    @InjectRepository(SiteSetting)
    private readonly repo: Repository<SiteSetting>,
    private readonly redis: RedisService,
  ) {}

  /** Public settings as a flat key→value map. Cached in Redis. */
  async getPublicConfig(): Promise<Record<string, unknown>> {
    const cached = await this.redis.getJson<Record<string, unknown>>(
      PUBLIC_CACHE_KEY,
    );
    if (cached) return cached;

    const rows = await this.repo.find({ where: { isPublic: true } });
    const map = rows.reduce<Record<string, unknown>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    await this.redis.setJson(PUBLIC_CACHE_KEY, map, PUBLIC_CACHE_TTL);
    return map;
  }

  /** All settings (admin), optionally filtered by section. */
  list(section?: ConfigSection): Promise<SiteSetting[]> {
    return this.repo.find({
      where: section ? { section } : {},
      order: { section: 'ASC', key: 'ASC' },
    });
  }

  get(key: string): Promise<SiteSetting | null> {
    return this.repo.findOne({ where: { key } });
  }

  async upsert(
    dto: UpsertSettingDto,
    adminUserId: string,
  ): Promise<SiteSetting> {
    const existing = await this.repo.findOne({ where: { key: dto.key } });
    const entity = this.repo.create({
      ...(existing ?? {}),
      key: dto.key,
      value: dto.value,
      section: dto.section ?? existing?.section ?? 'general',
      isPublic: dto.isPublic ?? existing?.isPublic ?? false,
      updatedBy: adminUserId,
    });
    const saved = await this.repo.save(entity);
    await this.invalidatePublicCache();
    return saved;
  }

  async bulkUpsert(
    settings: UpsertSettingDto[],
    adminUserId: string,
  ): Promise<SiteSetting[]> {
    const results: SiteSetting[] = [];
    for (const s of settings) {
      results.push(await this.upsert(s, adminUserId));
    }
    return results;
  }

  async remove(key: string): Promise<void> {
    await this.repo.delete({ key });
    await this.invalidatePublicCache();
  }

  private invalidatePublicCache(): Promise<void> {
    return this.redis.del(PUBLIC_CACHE_KEY);
  }
}
