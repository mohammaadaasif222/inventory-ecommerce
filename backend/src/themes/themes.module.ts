import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { Theme, ThemeSchema } from './schemas/theme.schema';
import {
  ThemeRevision,
  ThemeRevisionSchema,
} from './schemas/theme-revision.schema';
import { ThemesService } from './themes.service';
import { ThemesController } from './themes.controller';
import { ThemesGateway } from './themes.gateway';
import { ThemeEvents } from './theme.events';

/**
 * The theme engine's server half: the registry of installed packages, the
 * active-theme switch, customiser persistence and the rollback stack.
 *
 * The packages themselves live in the frontend's `themes/` directory — this
 * module never sees theme code, only which theme is live and how the merchant
 * has customised it. That split is what lets a theme be added by dropping a
 * folder, with no backend change at all.
 *
 * `JwtModule.register({})` mirrors the chat module: the gateway verifies
 * handshake tokens with an explicit secret, so no signing config is needed here.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Theme.name, schema: ThemeSchema },
      { name: ThemeRevision.name, schema: ThemeRevisionSchema },
    ]),
    JwtModule.register({}),
  ],
  controllers: [ThemesController],
  providers: [ThemesService, ThemesGateway, ThemeEvents],
  exports: [ThemesService],
})
export class ThemesModule {}
