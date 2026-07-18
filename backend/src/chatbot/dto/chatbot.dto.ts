import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class AskDto {
  @ApiProperty({ example: 'How do I track my order?' })
  @IsString()
  @Length(1, 1000)
  question: string;
}

export interface ChatbotSource {
  title: string;
  slug: string;
  excerpt: string;
}

export interface ChatbotAnswer {
  answer: string;
  sources: ChatbotSource[];
  usedLlm: boolean;
}
