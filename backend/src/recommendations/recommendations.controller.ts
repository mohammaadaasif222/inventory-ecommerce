import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recs: RecommendationsService) {}

  @Public()
  @Get('popular')
  @ResponseMessage('Popular products')
  popular(@Query('limit') limit?: string) {
    return this.recs.popular(toLimit(limit));
  }

  @Public()
  @Get('related/:productId')
  @ResponseMessage('Related products')
  related(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('limit') limit?: string,
  ) {
    return this.recs.related(productId, toLimit(limit));
  }

  @ApiBearerAuth()
  @Get('for-you')
  @ResponseMessage('Recommended for you')
  forYou(@CurrentUser('id') userId: string, @Query('limit') limit?: string) {
    return this.recs.forYou(userId, toLimit(limit));
  }
}

function toLimit(value?: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= 40 ? Math.floor(n) : 8;
}
