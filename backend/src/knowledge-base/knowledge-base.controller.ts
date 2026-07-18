import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { KnowledgeBaseService } from './knowledge-base.service';
import { ArticleKind, ArticleStatus } from './schemas/article.schema';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import {
  CreateArticleDto,
  CreateKbCategoryDto,
  UpdateArticleDto,
  VoteDto,
} from './dto/knowledge-base.dto';

const EDITORS = [Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT_AGENT];

@ApiTags('knowledge-base')
@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly kb: KnowledgeBaseService) {}

  // ── public ──
  @Public()
  @Get('categories')
  categories() {
    return this.kb.listCategories();
  }

  /** `?kind=post` lists the journal; default is help-centre articles. */
  @Public()
  @Get('articles')
  @ResponseMessage('Articles listed')
  published(
    @Query('categoryId') categoryId?: string,
    @Query('kind') kind?: string,
  ) {
    return this.kb.listPublished(categoryId, this.asKind(kind));
  }

  @Public()
  @Get('search')
  search(@Query('q') q: string, @Query('kind') kind?: string) {
    return this.kb.search(q, this.asKind(kind));
  }

  /** Unknown values fall back to the help default rather than erroring. */
  private asKind(value?: string): ArticleKind | undefined {
    return value === ArticleKind.POST ? ArticleKind.POST : undefined;
  }

  @Public()
  @Get('articles/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.kb.getBySlug(slug);
  }

  @Public()
  @Post('articles/:slug/vote')
  @ResponseMessage('Vote recorded')
  vote(@Param('slug') slug: string, @Body() dto: VoteDto) {
    return this.kb.vote(slug, dto.helpful);
  }

  // ── editors ──
  @ApiBearerAuth()
  @Roles(...EDITORS)
  @Get('admin/articles')
  adminList() {
    return this.kb.listAdmin();
  }

  @ApiBearerAuth()
  @Roles(...EDITORS)
  @Post('articles')
  @ResponseMessage('Article created')
  create(@Body() dto: CreateArticleDto, @CurrentUser('id') userId: string) {
    return this.kb.createArticle(dto, userId);
  }

  @ApiBearerAuth()
  @Roles(...EDITORS)
  @Patch('articles/:id')
  @ResponseMessage('Article updated')
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.kb.updateArticle(id, dto);
  }

  @ApiBearerAuth()
  @Roles(...EDITORS)
  @Post('articles/:id/publish')
  @ResponseMessage('Article published')
  publish(@Param('id') id: string) {
    return this.kb.setStatus(id, ArticleStatus.PUBLISHED);
  }

  @ApiBearerAuth()
  @Roles(...EDITORS)
  @Post('articles/:id/unpublish')
  @ResponseMessage('Article unpublished')
  unpublish(@Param('id') id: string) {
    return this.kb.setStatus(id, ArticleStatus.DRAFT);
  }

  @ApiBearerAuth()
  @Roles(...EDITORS)
  @Delete('articles/:id')
  @ResponseMessage('Article removed')
  async remove(@Param('id') id: string) {
    await this.kb.remove(id);
    return { removed: true };
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('categories')
  @ResponseMessage('Category created')
  createCategory(@Body() dto: CreateKbCategoryDto) {
    return this.kb.createCategory(dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Delete('categories/:id')
  @ResponseMessage('Category removed')
  async removeCategory(@Param('id') id: string) {
    await this.kb.removeCategory(id);
    return { removed: true };
  }
}
