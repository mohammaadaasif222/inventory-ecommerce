import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class StartChatDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 200)
  subject?: string;
}

export class CreateCannedResponseDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ example: '/greeting' })
  @IsString()
  shortcut: string;

  @ApiProperty()
  @IsString()
  content: string;
}
