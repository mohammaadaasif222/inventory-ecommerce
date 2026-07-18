import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  HomepageSection,
  HomepageSectionDocument,
} from './schemas/homepage-section.schema';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';
import {
  CreateSectionDto,
  UpdateSectionDto,
} from './dto/homepage.dto';

@Injectable()
export class HomepageBuilderService {
  constructor(
    @InjectModel(HomepageSection.name)
    private readonly sections: Model<HomepageSectionDocument>,
  ) {}

  /**
   * Visible sections in display order (storefront).
   *
   * With a theme slug, returns that theme's own sections plus the shared ones
   * (`theme: null`); without one, everything visible — the pre-scoping
   * behaviour, kept for older clients.
   */
  publicSections(theme?: string): Promise<HomepageSection[]> {
    const filter: Record<string, unknown> = { isVisible: true };
    if (theme) filter.$or = [{ theme: null }, { theme }];
    return this.sections.find(filter).sort({ order: 1 }).lean();
  }

  /** All sections incl. hidden (admin builder). */
  listAll(): Promise<HomepageSection[]> {
    return this.sections.find().sort({ order: 1 }).lean();
  }

  async create(dto: CreateSectionDto): Promise<HomepageSectionDocument> {
    const order = dto.order ?? (await this.sections.countDocuments());
    return this.sections.create({
      type: dto.type,
      title: dto.title ?? '',
      config: dto.config ?? {},
      isVisible: dto.isVisible ?? true,
      order,
      theme: dto.theme || null,
    });
  }

  async update(
    id: string,
    dto: UpdateSectionDto,
  ): Promise<HomepageSectionDocument> {
    const section = await this.byId(id);
    if (dto.type) section.type = dto.type;
    if (dto.title !== undefined) section.title = dto.title;
    if (dto.config !== undefined) section.config = dto.config;
    if (dto.isVisible !== undefined) section.isVisible = dto.isVisible;
    if (dto.order !== undefined) section.order = dto.order;
    if (dto.theme !== undefined) section.theme = dto.theme || null;
    return section.save();
  }

  async toggle(id: string): Promise<HomepageSectionDocument> {
    const section = await this.byId(id);
    section.isVisible = !section.isVisible;
    return section.save();
  }

  /** Persist a new ordering from the drag-and-drop builder. */
  async reorder(orderedIds: string[]): Promise<{ updated: number }> {
    await Promise.all(
      orderedIds.map((id, index) =>
        this.sections.updateOne({ _id: id }, { order: index }),
      ),
    );
    return { updated: orderedIds.length };
  }

  async remove(id: string): Promise<void> {
    await this.sections.deleteOne({ _id: id });
  }

  private async byId(id: string): Promise<HomepageSectionDocument> {
    const section = await this.sections.findById(id);
    if (!section) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Section not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return section;
  }
}
