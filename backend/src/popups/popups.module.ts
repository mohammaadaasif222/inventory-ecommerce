import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Popup, PopupSchema } from './schemas/popup.schema';
import { PopupsService } from './popups.service';
import { PopupsController } from './popups.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Popup.name, schema: PopupSchema }]),
  ],
  controllers: [PopupsController],
  providers: [PopupsService],
  exports: [PopupsService],
})
export class PopupsModule {}
