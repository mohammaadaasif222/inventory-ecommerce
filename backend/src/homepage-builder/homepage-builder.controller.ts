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
import { HomepageBuilderService } from './homepage-builder.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Role } from '../common/enums/role.enum';
import {
  CreateSectionDto,
  ReorderDto,
  UpdateSectionDto,
} from './dto/homepage.dto';

const ADMIN = [Role.ADMIN, Role.SUPER_ADMIN];

@ApiTags('homepage-builder')
@Controller('homepage')
export class HomepageBuilderController {
  constructor(private readonly homepage: HomepageBuilderService) {}

  @Public()
  @Get()
  @ResponseMessage('Homepage sections loaded')
  publicSections(@Query('theme') theme?: string) {
    return this.homepage.publicSections(theme);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Get('admin')
  listAll() {
    return this.homepage.listAll();
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Post()
  @ResponseMessage('Section created')
  create(@Body() dto: CreateSectionDto) {
    return this.homepage.create(dto);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Patch('reorder')
  @ResponseMessage('Sections reordered')
  reorder(@Body() dto: ReorderDto) {
    return this.homepage.reorder(dto.orderedIds);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Patch(':id')
  @ResponseMessage('Section updated')
  update(@Param('id') id: string, @Body() dto: UpdateSectionDto) {
    return this.homepage.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Patch(':id/toggle')
  @ResponseMessage('Section visibility toggled')
  toggle(@Param('id') id: string) {
    return this.homepage.toggle(id);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Delete(':id')
  @ResponseMessage('Section removed')
  async remove(@Param('id') id: string) {
    await this.homepage.remove(id);
    return { removed: true };
  }
}
