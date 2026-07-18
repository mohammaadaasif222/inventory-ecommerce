import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThemesService } from './themes.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { Audit } from '../admin/decorators/audit.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  ActivateThemeDto,
  CustomizeThemeDto,
  SyncThemesDto,
} from './dto/themes.dto';

/**
 * Theme registry and switching.
 *
 * Only `GET /themes/active` is public — it is on the storefront's render path,
 * so every request hits it and it must not require a session. Everything that
 * *changes* what shoppers see is admin-gated.
 */
@ApiTags('themes')
@Controller('themes')
export class ThemesController {
  constructor(private readonly themes: ThemesService) {}

  @Public()
  @Get('active')
  @ApiOperation({
    summary: 'The active theme slug and its customisations (Redis-cached)',
  })
  @ResponseMessage('Active theme loaded')
  active() {
    return this.themes.getActive();
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: 'Every installed theme, for the theme manager' })
  @ResponseMessage('Themes loaded')
  list() {
    return this.themes.list();
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('history')
  @ApiOperation({ summary: 'Recent theme changes, newest first' })
  @ResponseMessage('History loaded')
  history(@Query('limit') limit?: string) {
    return this.themes.history(limit ? Number(limit) : undefined);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('rollback-available')
  @ApiOperation({ summary: 'Whether a previous state exists to revert to' })
  @ResponseMessage('Checked')
  async rollbackAvailable() {
    return { canRollback: await this.themes.canRollback() };
  }

  /**
   * Reconcile the registry with the packages on disk.
   *
   * The frontend holds the theme files, so it is the only thing that can
   * report what is installed. Called by the admin's theme manager on load.
   */
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('sync')
  @Audit('THEMES_SYNCED', 'Theme')
  @ApiOperation({ summary: 'Register the theme packages present on disk' })
  @ResponseMessage('Themes synced')
  sync(@Body() dto: SyncThemesDto) {
    return this.themes.sync(dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get(':slug')
  @ApiOperation({ summary: 'One installed theme' })
  @ResponseMessage('Theme loaded')
  findOne(@Param('slug') slug: string) {
    return this.themes.findOne(slug);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post(':slug/activate')
  @Audit('THEME_ACTIVATED', 'Theme')
  @ApiOperation({
    summary: 'Publish a theme — invalidates cache and pushes to live sessions',
  })
  @ResponseMessage('Theme activated')
  activate(
    @Param('slug') slug: string,
    @Body() dto: ActivateThemeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.themes.activate(slug, dto, user?.id ?? null);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch(':slug/customize')
  @Audit('THEME_CUSTOMIZED', 'Theme')
  @ApiOperation({ summary: 'Save customiser overrides for a theme' })
  @ResponseMessage('Theme customised')
  customize(
    @Param('slug') slug: string,
    @Body() dto: CustomizeThemeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.themes.customize(slug, dto, user?.id ?? null);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('rollback')
  @Audit('THEME_ROLLED_BACK', 'Theme')
  @ApiOperation({ summary: 'Revert the last activate or customise' })
  @ResponseMessage('Theme rolled back')
  rollback(@CurrentUser() user: AuthenticatedUser) {
    return this.themes.rollback(user?.id ?? null);
  }
}
