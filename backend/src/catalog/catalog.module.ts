import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Brand } from './entities/brand.entity';
import { Tag } from './entities/tag.entity';
import { Attribute } from './entities/attribute.entity';
import { Collection } from './entities/collection.entity';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Brand, Tag, Attribute, Collection]),
  ],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
