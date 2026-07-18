import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Page, PageDocument, PageStatus } from './schemas/page.schema';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';
import { slugify } from '../common/utils/slug.util';
import { CreatePageDto, UpdatePageDto } from './dto/page.dto';

@Injectable()
export class PagesService {
  constructor(
    @InjectModel(Page.name) private readonly pages: Model<PageDocument>,
  ) {}

  async create(dto: CreatePageDto): Promise<PageDocument> {
    const slug = await this.uniqueSlug(dto.slug || dto.title);
    return this.pages.create({
      title: dto.title,
      slug,
      blocks: dto.blocks ?? [],
      seo: dto.seo ?? {},
      status: PageStatus.DRAFT,
    });
  }

  async update(id: string, dto: UpdatePageDto): Promise<PageDocument> {
    const page = await this.byId(id);
    if (dto.title) page.title = dto.title;
    if (dto.slug) page.slug = await this.uniqueSlug(dto.slug, id);
    if (dto.blocks !== undefined) page.blocks = dto.blocks;
    if (dto.seo !== undefined) page.seo = dto.seo;
    return page.save();
  }

  async setStatus(id: string, status: PageStatus): Promise<PageDocument> {
    const page = await this.byId(id);
    page.status = status;
    if (status === PageStatus.PUBLISHED && !page.publishedAt) {
      page.publishedAt = new Date();
    }
    return page.save();
  }

  async remove(id: string): Promise<void> {
    await this.pages.deleteOne({ _id: id });
  }

  listAdmin(): Promise<Page[]> {
    return this.pages.find().sort({ updatedAt: -1 }).lean();
  }

  /** Published page slugs — used by the sitemap. */
  publishedSlugs(): Promise<{ slug: string; updatedAt?: Date }[]> {
    return this.pages
      .find({ status: PageStatus.PUBLISHED })
      .select('slug updatedAt')
      .lean() as unknown as Promise<{ slug: string; updatedAt?: Date }[]>;
  }

  async getBySlug(slug: string): Promise<PageDocument> {
    const page = await this.pages.findOne({
      slug,
      status: PageStatus.PUBLISHED,
    });
    if (!page) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Page not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return page;
  }

  private async byId(id: string): Promise<PageDocument> {
    const page = await this.pages.findById(id);
    if (!page) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Page not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return page;
  }

  private async uniqueSlug(input: string, ignoreId?: string): Promise<string> {
    const base = slugify(input);
    let candidate = base;
    let n = 1;
    while (true) {
      const existing = await this.pages.findOne({ slug: candidate });
      if (!existing || String(existing._id) === ignoreId) return candidate;
      candidate = `${base}-${++n}`;
    }
  }
}
