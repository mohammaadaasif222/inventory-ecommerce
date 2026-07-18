import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SeoService } from './seo.service';
import { SeoScope } from './schemas/seo-meta.schema';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Role } from '../common/enums/role.enum';
import { UpsertSeoDto } from './dto/seo.dto';

@ApiTags('seo')
@Controller('seo')
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  @Public()
  @Get('global')
  @ResponseMessage('Global SEO loaded')
  global() {
    return this.seo.getGlobal();
  }

  @Public()
  @Get('resolve')
  @ResponseMessage('SEO resolved')
  resolve(
    @Query('scope') scope: SeoScope,
    @Query('entityId') entityId: string,
  ) {
    return this.seo.resolve(scope, entityId);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get()
  list() {
    return this.seo.list();
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Put()
  @ResponseMessage('SEO saved')
  upsert(@Body() dto: UpsertSeoDto) {
    return this.seo.upsert(dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Delete(':id')
  @ResponseMessage('SEO entry removed')
  async remove(@Param('id') id: string) {
    await this.seo.remove(id);
    return { removed: true };
  }
}
