import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  HomepageSection,
  HomepageSectionSchema,
} from './schemas/homepage-section.schema';
import { HomepageBuilderService } from './homepage-builder.service';
import { HomepageBuilderController } from './homepage-builder.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HomepageSection.name, schema: HomepageSectionSchema },
    ]),
  ],
  controllers: [HomepageBuilderController],
  providers: [HomepageBuilderService],
  exports: [HomepageBuilderService],
})
export class HomepageBuilderModule {}
