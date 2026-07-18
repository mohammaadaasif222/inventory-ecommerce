import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeoMeta, SeoMetaSchema } from './schemas/seo-meta.schema';
import { SeoService } from './seo.service';
import { SeoController } from './seo.controller';
import { SitemapController } from './sitemap.controller';
import { ProductsModule } from '../products/products.module';
import { CatalogModule } from '../catalog/catalog.module';
import { PagesModule } from '../pages/pages.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SeoMeta.name, schema: SeoMetaSchema }]),
    ProductsModule,
    CatalogModule,
    PagesModule,
  ],
  controllers: [SeoController, SitemapController],
  providers: [SeoService],
  exports: [SeoService],
})
export class SeoModule {}
