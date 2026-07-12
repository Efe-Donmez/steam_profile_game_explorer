import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { GameAchievement, GameAchievementSchema } from './schemas/game-achievement.schema';
import { GlobalAchievementStat, GlobalAchievementStatSchema } from './schemas/global-achievement-stat.schema';
import { AchievementsService } from './achievements.service';
import { AchievementsSyncService } from './achievements-sync.service';
import { AchievementsSyncProcessor } from './processors/achievements-sync.processor';
import { SteamApiModule } from '../steam-api/steam-api.module';

@Module({
  imports: [
    SteamApiModule,
    MongooseModule.forFeature([
      { name: GameAchievement.name, schema: GameAchievementSchema },
      { name: GlobalAchievementStat.name, schema: GlobalAchievementStatSchema },
    ]),
    BullModule.registerQueue({ name: 'achievements-sync' }),
  ],
  providers: [AchievementsService, AchievementsSyncService, AchievementsSyncProcessor],
  exports: [AchievementsService, AchievementsSyncService],
})
export class AchievementsModule {}
