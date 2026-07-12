import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { SteamSpyCache, SteamSpyCacheSchema } from './schemas/steam-spy-cache.schema';
import { Game, GameSchema } from '../catalog/schemas/game.schema';
import { SteamSpyService } from './steamspy.service';
import { SteamSpySyncService } from './steamspy-sync.service';
import { SteamSpySyncProcessor } from './processors/steamspy-sync.processor';
import { SteamSpyApiModule } from '../steamspy-api/steamspy-api.module';

@Module({
  imports: [
    SteamSpyApiModule,
    MongooseModule.forFeature([
      { name: SteamSpyCache.name, schema: SteamSpyCacheSchema },
      { name: Game.name, schema: GameSchema },
    ]),
    BullModule.registerQueue({ name: 'steamspy-sync' }),
  ],
  providers: [SteamSpyService, SteamSpySyncService, SteamSpySyncProcessor],
  exports: [SteamSpyService, SteamSpySyncService],
})
export class SteamSpyModule {}
