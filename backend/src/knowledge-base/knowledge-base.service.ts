import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Article,
  ArticleDocument,
  ArticleKind,
  ArticleStatus,
  ContentBlock,
} from './schemas/article.schema';
import {
  KbCategory,
  KbCategoryDocument,
} from './schemas/kb-category.schema';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';
import { slugify } from '../common/utils/slug.util';
import {
  CreateArticleDto,
  CreateKbCategoryDto,
  UpdateArticleDto,
} from './dto/knowledge-base.dto';

@Injectable()
export class KnowledgeBaseService {
  constructor(
    @InjectModel(Article.name)
    private readonly articles: Model<ArticleDocument>,
    @InjectModel(KbCategory.name)
    private readonly categories: Model<KbCategoryDocument>,
  ) {}

  // ── categories ──
  createCategory(dto: CreateKbCategoryDto): Promise<KbCategoryDocument> {
    return this.categories.create({
      name: dto.name,
      slug: slugify(dto.name),
      description: dto.description ?? '',
    });
  }
  listCategories(): Promise<KbCategory[]> {
    return this.categories.find().sort({ sortOrder: 1, name: 1 }).lean();
  }
  async removeCategory(id: string): Promise<void> {
    await this.categories.deleteOne({ _id: id });
  }

  // ── articles (admin) ──
  async createArticle(
    dto: CreateArticleDto,
    authorId: string,
  ): Promise<ArticleDocument> {
    const slug = await this.uniqueSlug(dto.title);
    return this.articles.create({
      title: dto.title,
      slug,
      excerpt: dto.excerpt ?? '',
      blocks: dto.blocks ?? [],
      searchText: this.flatten(dto.title, dto.excerpt, dto.blocks),
      categoryId: dto.categoryId ?? null,
      tags: dto.tags ?? [],
      status: ArticleStatus.DRAFT,
      kind: dto.kind ?? ArticleKind.HELP,
      authorId,
    });
  }

  async updateArticle(
    id: string,
    dto: UpdateArticleDto,
  ): Promise<ArticleDocument> {
    const article = await this.byId(id);
    if (dto.title) {
      article.title = dto.title;
      article.slug = await this.uniqueSlug(dto.title, id);
    }
    if (dto.excerpt !== undefined) article.excerpt = dto.excerpt;
    if (dto.blocks !== undefined) article.blocks = dto.blocks;
    if (dto.categoryId !== undefined) article.categoryId = dto.categoryId;
    if (dto.tags !== undefined) article.tags = dto.tags;
    if (dto.kind !== undefined) article.kind = dto.kind;
    article.searchText = this.flatten(
      article.title,
      article.excerpt,
      article.blocks,
    );
    return article.save();
  }

  async setStatus(
    id: string,
    status: ArticleStatus,
  ): Promise<ArticleDocument> {
    const article = await this.byId(id);
    article.status = status;
    article.publishedAt =
      status === ArticleStatus.PUBLISHED
        ? (article.publishedAt ?? new Date())
        : article.publishedAt;
    return article.save();
  }

  async remove(id: string): Promise<void> {
    await this.articles.deleteOne({ _id: id });
  }

  listAdmin(): Promise<Article[]> {
    return this.articles.find().sort({ updatedAt: -1 }).lean();
  }

  // ── public ──
  /**
   * Defaults to `help` rather than "everything": the surfaces predating the
   * discriminator (help centre, chatbot grounding) must not start surfacing
   * journal posts just because the blog now exists.
   */
  listPublished(categoryId?: string, kind?: ArticleKind): Promise<Article[]> {
    return this.articles
      .find({
        status: ArticleStatus.PUBLISHED,
        kind: kind ?? ArticleKind.HELP,
        ...(categoryId ? { categoryId } : {}),
      })
      .sort({ publishedAt: -1 })
      .select('-blocks -searchText')
      .lean();
  }

  search(query: string, kind?: ArticleKind): Promise<Article[]> {
    if (!query?.trim()) return Promise.resolve([]);
    return this.articles
      .find(
        {
          $text: { $search: query },
          status: ArticleStatus.PUBLISHED,
          kind: kind ?? ArticleKind.HELP,
        },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(20)
      .select('-blocks -searchText')
      .lean();
  }

  async getBySlug(slug: string): Promise<ArticleDocument> {
    const article = await this.articles.findOneAndUpdate(
      { slug, status: ArticleStatus.PUBLISHED },
      { $inc: { views: 1 } },
      { new: true },
    );
    if (!article) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Article not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return article;
  }

  async vote(slug: string, helpful: boolean): Promise<{ helpful: number; notHelpful: number }> {
    const field = helpful ? 'helpfulYes' : 'helpfulNo';
    const article = await this.articles.findOneAndUpdate(
      { slug },
      { $inc: { [field]: 1 } },
      { new: true },
    );
    if (!article) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Article not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return { helpful: article.helpfulYes, notHelpful: article.helpfulNo };
  }

  // ── helpers ──
  private async byId(id: string): Promise<ArticleDocument> {
    const article = await this.articles.findById(id);
    if (!article) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Article not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return article;
  }

  private flatten(
    title: string,
    excerpt?: string,
    blocks?: ContentBlock[],
  ): string {
    const blockText = (blocks ?? [])
      .map((b) => Object.values(b.data ?? {}).filter((v) => typeof v === 'string'))
      .flat()
      .join(' ');
    return [title, excerpt ?? '', blockText].join(' ').slice(0, 5000);
  }

  private async uniqueSlug(title: string, ignoreId?: string): Promise<string> {
    const base = slugify(title);
    let candidate = base;
    let n = 1;
    while (true) {
      const existing = await this.articles.findOne({ slug: candidate });
      if (!existing || String(existing._id) === ignoreId) return candidate;
      candidate = `${base}-${++n}`;
    }
  }
}
