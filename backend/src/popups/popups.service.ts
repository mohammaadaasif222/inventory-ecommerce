import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Popup, PopupDocument } from './schemas/popup.schema';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';
import { CreatePopupDto, UpdatePopupDto } from './dto/popup.dto';

@Injectable()
export class PopupsService {
  constructor(
    @InjectModel(Popup.name) private readonly popups: Model<PopupDocument>,
  ) {}

  listAll(): Promise<Popup[]> {
    return this.popups.find().sort({ createdAt: -1 }).lean();
  }

  /** Active popups whose page targets match the given path (storefront). */
  async activeForPath(path?: string): Promise<Popup[]> {
    const active = await this.popups.find({ isActive: true }).lean();
    if (!path) return active;
    return active.filter((p) => this.matchesPath(p.displayRules?.pageTargets, path));
  }

  create(dto: CreatePopupDto): Promise<PopupDocument> {
    return this.popups.create({
      type: dto.type,
      title: dto.title ?? '',
      content: dto.content ?? {},
      displayRules: dto.displayRules ?? {},
      isActive: dto.isActive ?? false,
    });
  }

  async update(id: string, dto: UpdatePopupDto): Promise<PopupDocument> {
    const popup = await this.byId(id);
    if (dto.type) popup.type = dto.type;
    if (dto.title !== undefined) popup.title = dto.title;
    if (dto.content !== undefined) popup.content = dto.content;
    if (dto.displayRules !== undefined) popup.displayRules = dto.displayRules;
    if (dto.isActive !== undefined) popup.isActive = dto.isActive;
    return popup.save();
  }

  async toggle(id: string): Promise<PopupDocument> {
    const popup = await this.byId(id);
    popup.isActive = !popup.isActive;
    return popup.save();
  }

  async remove(id: string): Promise<void> {
    await this.popups.deleteOne({ _id: id });
  }

  private matchesPath(targets: string[] | undefined, path: string): boolean {
    if (!targets || targets.length === 0) return true;
    return targets.some((t) => {
      if (t === path) return true;
      if (t.endsWith('/*')) return path.startsWith(t.slice(0, -2));
      return false;
    });
  }

  private async byId(id: string): Promise<PopupDocument> {
    const popup = await this.popups.findById(id);
    if (!popup) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Popup not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return popup;
  }
}
