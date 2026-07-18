import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateCannedResponseDto, StartChatDto } from './dto/chat.dto';

const AGENTS = [Role.SUPPORT_AGENT, Role.ADMIN, Role.SUPER_ADMIN];

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  // ── customer ──
  @Post('start')
  @ResponseMessage('Chat started')
  start(@Body() dto: StartChatDto, @CurrentUser('id') userId: string) {
    return this.chat.createChat(userId, dto.subject);
  }

  @Get('mine')
  mine(@CurrentUser('id') userId: string) {
    return this.chat.listCustomerChats(userId);
  }

  @Get(':id/messages')
  @ResponseMessage('Messages loaded')
  async messages(
    @Param('id') chatId: string,
    @Query('cursor') cursor?: string,
  ) {
    const { data, nextCursor } = await this.chat.getMessages(chatId, cursor);
    return { data, meta: { nextCursor } };
  }

  // ── agent ──
  @Get('agent/waiting')
  @Roles(...AGENTS)
  waiting() {
    return this.chat.listWaitingChats();
  }

  @Get('agent/queue')
  @Roles(...AGENTS)
  queue(@CurrentUser('id') agentId: string) {
    return this.chat.listAgentChats(agentId);
  }

  @Get('agents/online')
  @Roles(...AGENTS)
  online() {
    return this.chat.listOnlineAgents();
  }

  // ── canned responses ──
  @Get('canned')
  @Roles(...AGENTS)
  listCanned() {
    return this.chat.listCanned();
  }

  @Post('canned')
  @Roles(...AGENTS)
  @ResponseMessage('Canned response created')
  createCanned(
    @Body() dto: CreateCannedResponseDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.chat.createCanned({ ...dto, createdBy: userId });
  }

  @Delete('canned/:id')
  @Roles(...AGENTS)
  @ResponseMessage('Canned response removed')
  async removeCanned(@Param('id') id: string) {
    await this.chat.removeCanned(id);
    return { removed: true };
  }
}
