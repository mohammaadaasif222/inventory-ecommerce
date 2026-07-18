import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteSetting } from './entities/site-setting.entity';
import { WebsiteConfigService } from './website-config.service';
import { WebsiteConfigController } from './website-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SiteSetting])],
  controllers: [WebsiteConfigController],
  providers: [WebsiteConfigService],
  exports: [WebsiteConfigService],
})
export class WebsiteConfigModule {}
