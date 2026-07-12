import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SteamApiService } from '../../steam-api/steam-api.service';
import { AchievementsService } from '../achievements.service';

export interface PlayerAchievementsJobData {
  userId: string;
  steamId: string;
  appid: number;
}

export interface GlobalAchievementsJobData {
  appid: number;
}

// Achievements sync is the most expensive job (one request per owned game,
// per user) so it always runs as a low-priority background queue that never
// blocks the user-facing flows from Steam/Catalog/Reviews sync.
@Injectable()
@Processor('achievements-sync', { concurrency: 2, limiter: { max: 4, duration: 1000 } })
export class AchievementsSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(AchievementsSyncProcessor.name);

  constructor(
    private readonly steamApi: SteamApiService,
    private readonly achievementsService: AchievementsService,
  ) {
    super();
  }

  async process(job: Job<PlayerAchievementsJobData | GlobalAchievementsJobData>): Promise<void> {
    if (job.name === 'sync-player-achievements') {
      const { userId, steamId, appid } = job.data as PlayerAchievementsJobData;
      const achievements = await this.steamApi.getPlayerAchievements(steamId, appid);
      if (!achievements) {
        return;
      }
      await this.achievementsService.upsertPlayerAchievements(userId, appid, achievements);
      return;
    }

    if (job.name === 'sync-global-achievements') {
      const { appid } = job.data as GlobalAchievementsJobData;
      const entries = await this.steamApi.getGlobalAchievementPercentages(appid);
      if (!entries) {
        return;
      }
      await this.achievementsService.upsertGlobalStats(appid, entries);
      return;
    }

    this.logger.warn(`Bilinmeyen job tipi: ${job.name}`);
  }
}
