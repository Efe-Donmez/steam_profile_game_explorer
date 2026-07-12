import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SteamLibrary, SteamLibrarySchema } from '../steam/schemas/steam-library.schema';
import { PlaytimeSnapshot, PlaytimeSnapshotSchema } from '../steam/schemas/playtime-snapshot.schema';
import { Game, GameSchema } from '../catalog/schemas/game.schema';
import { GameReview, GameReviewSchema } from '../reviews/schemas/game-review.schema';
import { GameAchievement, GameAchievementSchema } from '../achievements/schemas/game-achievement.schema';
import {
  GlobalAchievementStat,
  GlobalAchievementStatSchema,
} from '../achievements/schemas/global-achievement-stat.schema';
import { SteamSpyCache, SteamSpyCacheSchema } from '../steamspy/schemas/steam-spy-cache.schema';
import { UserProfile, UserProfileSchema } from './schemas/user-profile.schema';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SteamLibrary.name, schema: SteamLibrarySchema },
      { name: PlaytimeSnapshot.name, schema: PlaytimeSnapshotSchema },
      { name: Game.name, schema: GameSchema },
      { name: GameReview.name, schema: GameReviewSchema },
      { name: GameAchievement.name, schema: GameAchievementSchema },
      { name: GlobalAchievementStat.name, schema: GlobalAchievementStatSchema },
      { name: SteamSpyCache.name, schema: SteamSpyCacheSchema },
      { name: UserProfile.name, schema: UserProfileSchema },
    ]),
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
