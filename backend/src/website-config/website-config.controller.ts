import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WebsiteConfigService } from './website-config.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { ConfigSection } from './entities/site-setting.entity';
import { BulkUpsertDto, UpsertSettingDto } from './dto/website-config.dto';

@ApiTags('website-config')
@Controller('config')
export class WebsiteConfigController {
  constructor(private readonly config: WebsiteConfigService) {}

  /** Storefront bootstrap config — unauthenticated, Redis-cached. */
  @Public()
  @Get('public')
  @ResponseMessage('Public config loaded')
  getPublic() {
    return this.config.getPublicConfig();
  }

  @ApiBearerAuth()
  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ResponseMessage('Settings listed')
  list(@Query('section') section?: ConfigSection) {
    return this.config.list(section);
  }

  @ApiBearerAuth()
  @Get(':key')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  get(@Param('key') key: string) {
    return this.config.get(key);
  }

  @ApiBearerAuth()
  @Put(':key')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ResponseMessage('Setting saved')
  upsert(
    @Param('key') key: string,
    @Body() dto: UpsertSettingDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.config.upsert({ ...dto, key }, adminId);
  }

  @ApiBearerAuth()
  @Post('bulk')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ResponseMessage('Settings saved')
  bulk(@Body() dto: BulkUpsertDto, @CurrentUser('id') adminId: string) {
    return this.config.bulkUpsert(dto.settings, adminId);
  }

  @ApiBearerAuth()
  @Delete(':key')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ResponseMessage('Setting removed')
  async remove(@Param('key') key: string) {
    await this.config.remove(key);
    return { removed: true };
  }
}
