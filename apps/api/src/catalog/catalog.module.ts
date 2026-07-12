import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Game, GameSchema } from './schemas/game.schema';
import { SteamSpyCache, SteamSpyCacheSchema } from '../steamspy/schemas/steam-spy-cache.schema';
import { CatalogService } from './catalog.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Game.name, schema: GameSchema },
      { name: SteamSpyCache.name, schema: SteamSpyCacheSchema },
    ]),
  ],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
