import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PagesService } from './pages.service';
import { PageStatus } from './schemas/page.schema';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Role } from '../common/enums/role.enum';
import { CreatePageDto, UpdatePageDto } from './dto/page.dto';

const ADMIN = [Role.ADMIN, Role.SUPER_ADMIN];

@ApiTags('pages')
@Controller('pages')
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  @Public()
  @Get('by-slug/:slug')
  @ResponseMessage('Page loaded')
  bySlug(@Param('slug') slug: string) {
    return this.pages.getBySlug(slug);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Get()
  list() {
    return this.pages.listAdmin();
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Post()
  @ResponseMessage('Page created')
  create(@Body() dto: CreatePageDto) {
    return this.pages.create(dto);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Patch(':id')
  @ResponseMessage('Page updated')
  update(@Param('id') id: string, @Body() dto: UpdatePageDto) {
    return this.pages.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Post(':id/publish')
  @ResponseMessage('Page published')
  publish(@Param('id') id: string) {
    return this.pages.setStatus(id, PageStatus.PUBLISHED);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Post(':id/unpublish')
  @ResponseMessage('Page unpublished')
  unpublish(@Param('id') id: string) {
    return this.pages.setStatus(id, PageStatus.DRAFT);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Delete(':id')
  @ResponseMessage('Page removed')
  async remove(@Param('id') id: string) {
    await this.pages.remove(id);
    return { removed: true };
  }
}
