import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { ResponseMessage } from './common/decorators/response-message.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ResponseMessage('Service healthy')
  check() {
    return { status: 'ok', uptime: process.uptime() };
  }
}
