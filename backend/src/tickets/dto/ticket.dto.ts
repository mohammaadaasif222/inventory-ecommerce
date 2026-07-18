import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import {
  TicketPriority,
  TicketStatus,
} from '../enums/ticket.enum';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreateTicketDto {
  @ApiProperty()
  @IsString()
  @Length(1, 255)
  subject: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: TicketStatus })
  @IsEnum(TicketStatus)
  status: TicketStatus;
}

export class AssignTicketDto {
  @ApiProperty()
  @IsUUID()
  assigneeId: string;
}

export class SetPriorityDto {
  @ApiProperty({ enum: TicketPriority })
  @IsEnum(TicketPriority)
  priority: TicketPriority;
}

export class AddNoteDto {
  @ApiProperty()
  @IsString()
  body: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

export class ListTicketsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}

export class UpsertSlaDto {
  @ApiProperty({ enum: TicketPriority })
  @IsEnum(TicketPriority)
  priority: TicketPriority;

  @ApiProperty()
  @IsInt()
  @Min(1)
  responseMinutes: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  resolutionMinutes: number;
}

export class EmailIngestDto {
  @ApiProperty()
  @IsString()
  from: string;

  @ApiProperty()
  @IsString()
  subject: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ description: 'Resolved customer id, if known' })
  @IsOptional()
  @IsUUID()
  customerId?: string;
}
