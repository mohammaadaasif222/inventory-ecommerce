import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { NotificationChannel } from '../enums/notification.enum';

export class UpsertTemplateDto {
  @ApiProperty({ example: 'order.confirmed' })
  @IsString()
  key: string;

  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'Handlebars template body' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SendNotificationDto {
  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({ description: 'Recipient email / phone / device token' })
  @IsString()
  to: string;

  @ApiProperty({ example: 'order.confirmed' })
  @IsString()
  templateKey: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;
}

export class UpdatePreferenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  whatsapp?: boolean;
}

/** Job payload enqueued to a channel queue. */
export interface NotificationJob {
  logId: string;
  channel: NotificationChannel;
  to: string;
  subject: string;
  body: string;
}
