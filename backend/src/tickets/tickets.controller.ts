import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { Audit } from '../admin/decorators/audit.decorator';
import {
  AddNoteDto,
  AssignTicketDto,
  CreateTicketDto,
  EmailIngestDto,
  ListTicketsQueryDto,
  SetPriorityDto,
  UpdateTicketStatusDto,
  UpsertSlaDto,
} from './dto/ticket.dto';

const AGENTS = [Role.SUPPORT_AGENT, Role.ADMIN, Role.SUPER_ADMIN];

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  // ── customer ──
  @ApiBearerAuth()
  @Post()
  @ResponseMessage('Ticket created')
  create(@Body() dto: CreateTicketDto, @CurrentUser('id') userId: string) {
    return this.tickets.create(dto, userId);
  }

  // ── email-to-ticket ingestion (inbound mail webhook) ──
  @Public()
  @Post('ingest/email')
  @ResponseMessage('Ticket created from email')
  ingest(@Body() dto: EmailIngestDto) {
    return this.tickets.ingestEmail(dto);
  }

  // ── agent / admin ──
  @ApiBearerAuth()
  @Get()
  @Roles(...AGENTS)
  @ResponseMessage('Tickets listed')
  list(@Query() query: ListTicketsQueryDto) {
    return this.tickets.list(query);
  }

  @ApiBearerAuth()
  @Get('sla')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  listSla() {
    return this.tickets.listSla();
  }

  @ApiBearerAuth()
  @Patch('sla')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ResponseMessage('SLA updated')
  upsertSla(@Body() dto: UpsertSlaDto) {
    return this.tickets.upsertSla(dto);
  }

  @ApiBearerAuth()
  @Get(':id')
  @Roles(...AGENTS)
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tickets.findOne(id);
  }

  @ApiBearerAuth()
  @Patch(':id/status')
  @Roles(...AGENTS)
  @Audit('TICKET_STATUS_CHANGED', 'Ticket')
  @ResponseMessage('Ticket status updated')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.tickets.updateStatus(id, dto.status);
  }

  @ApiBearerAuth()
  @Patch(':id/assign')
  @Roles(...AGENTS)
  @ResponseMessage('Ticket assigned')
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTicketDto,
  ) {
    return this.tickets.assign(id, dto.assigneeId);
  }

  @ApiBearerAuth()
  @Patch(':id/priority')
  @Roles(...AGENTS)
  @ResponseMessage('Priority updated')
  setPriority(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetPriorityDto,
  ) {
    return this.tickets.setPriority(id, dto.priority);
  }

  @ApiBearerAuth()
  @Post(':id/notes')
  @Roles(...AGENTS)
  @ResponseMessage('Note added')
  addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddNoteDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.tickets.addNote(id, userId, dto);
  }
}
