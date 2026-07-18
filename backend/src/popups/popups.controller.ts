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
import { PopupsService } from './popups.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Role } from '../common/enums/role.enum';
import { CreatePopupDto, UpdatePopupDto } from './dto/popup.dto';

const ADMIN = [Role.ADMIN, Role.SUPER_ADMIN];

@ApiTags('popups')
@Controller('popups')
export class PopupsController {
  constructor(private readonly popups: PopupsService) {}

  @Public()
  @Get('active')
  @ResponseMessage('Active popups loaded')
  active(@Query('path') path?: string) {
    return this.popups.activeForPath(path);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Get()
  list() {
    return this.popups.listAll();
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Post()
  @ResponseMessage('Popup created')
  create(@Body() dto: CreatePopupDto) {
    return this.popups.create(dto);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Patch(':id')
  @ResponseMessage('Popup updated')
  update(@Param('id') id: string, @Body() dto: UpdatePopupDto) {
    return this.popups.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Patch(':id/toggle')
  @ResponseMessage('Popup toggled')
  toggle(@Param('id') id: string) {
    return this.popups.toggle(id);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Delete(':id')
  @ResponseMessage('Popup removed')
  async remove(@Param('id') id: string) {
    await this.popups.remove(id);
    return { removed: true };
  }
}
