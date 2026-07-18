import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import {
  SendNotificationDto,
  UpdatePreferenceDto,
  UpsertTemplateDto,
} from './dto/notification.dto';

const ADMIN = [Role.ADMIN, Role.SUPER_ADMIN];

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  // ── templates (admin) ──
  @Get('templates')
  @Roles(...ADMIN)
  listTemplates() {
    return this.notifications.listTemplates();
  }

  @Put('templates')
  @Roles(...ADMIN)
  @ResponseMessage('Template saved')
  upsertTemplate(@Body() dto: UpsertTemplateDto) {
    return this.notifications.upsertTemplate(dto);
  }

  @Delete('templates/:key')
  @Roles(...ADMIN)
  @ResponseMessage('Template removed')
  async removeTemplate(@Param('key') key: string) {
    await this.notifications.removeTemplate(key);
    return { removed: true };
  }

  // ── send (admin / internal) ──
  @Post('send')
  @Roles(...ADMIN)
  @ResponseMessage('Notification queued')
  send(@Body() dto: SendNotificationDto) {
    return this.notifications.send(dto);
  }

  @Get('logs')
  @Roles(...ADMIN)
  logs() {
    return this.notifications.listLogs();
  }

  // ── preferences (self) ──
  @Get('preferences')
  @ResponseMessage('Preferences loaded')
  myPreferences(@CurrentUser('id') userId: string) {
    return this.notifications.getPreferences(userId);
  }

  @Patch('preferences')
  @ResponseMessage('Preferences updated')
  updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePreferenceDto,
  ) {
    return this.notifications.updatePreferences(userId, dto);
  }
}
