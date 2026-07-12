import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Game, GameSchema } from '../catalog/schemas/game.schema';
import { UserProfile, UserProfileSchema } from '../profile/schemas/user-profile.schema';
import { SteamSpyApiModule } from '../steamspy-api/steamspy-api.module';
import { StoreSyncModule } from '../store-sync/store-sync.module';
import { SteamSpyModule } from '../steamspy/steamspy.module';
import { CatalogSeedService } from './catalog-seed.service';

@Module({
  imports: [
    SteamSpyApiModule,
    StoreSyncModule,
    SteamSpyModule,
    MongooseModule.forFeature([
      { name: Game.name, schema: GameSchema },
      { name: UserProfile.name, schema: UserProfileSchema },
    ]),
  ],
  providers: [CatalogSeedService],
})
export class CatalogSeedModule {}
