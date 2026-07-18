import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChatbotService } from './chatbot.service';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { AskDto } from './dto/chatbot.dto';

@ApiTags('chatbot')
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbot: ChatbotService) {}

  @Public()
  @Post('ask')
  @ResponseMessage('Answer generated')
  ask(@Body() dto: AskDto) {
    return this.chatbot.ask(dto.question);
  }
}
