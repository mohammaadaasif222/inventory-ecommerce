import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SeoService } from './seo.service';
import { Public } from '../common/decorators/public.decorator';
import { RawResponse } from '../common/decorators/raw-response.decorator';

/**
 * Served at the domain root (excluded from the global API prefix in main.ts)
 * and returned raw (no JSON envelope) via @RawResponse.
 */
@ApiTags('seo')
@Controller()
export class SitemapController {
  constructor(private readonly seo: SeoService) {}

  @Public()
  @RawResponse()
  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  sitemap() {
    return this.seo.buildSitemap();
  }

  @Public()
  @RawResponse()
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  robots() {
    return this.seo.buildRobots();
  }
}
