import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AchievementsService } from './achievements.service';
import {
  GlobalAchievementsJobData,
  PlayerAchievementsJobData,
} from './processors/achievements-sync.processor';

// Achievement completion changes as the user keeps playing, unlike most other
// cached data — re-check every 3 days so `completionPercent` and the "rarest
// achievements" panel don't stay frozen at whatever they were on first sync.
const PLAYER_ACHIEVEMENTS_STALE_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

@Injectable()
export class AchievementsSyncService {
  constructor(
    private readonly achievementsService: AchievementsService,
    @InjectQueue('achievements-sync')
    private readonly queue: Queue<PlayerAchievementsJobData | GlobalAchievementsJobData>,
  ) {}

  async enqueueForLibrary(userId: string, steamId: string, appids: number[]): Promise<void> {
    const stalePlayer = await this.achievementsService.findMissingOrStalePlayerAchievements(
      userId,
      appids,
      PLAYER_ACHIEVEMENTS_STALE_AFTER_MS,
    );
    for (const appid of stalePlayer) {
      // See store-sync.service.ts: a fixed jobId would swallow every
      // staleness-triggered re-add after the first sync.
      await this.queue.add(
        'sync-player-achievements',
        { userId, steamId, appid },
        { jobId: `player-ach-${userId}-${appid}-${Date.now()}`, priority: 10 },
      );
    }

    const missingGlobal = await this.achievementsService.findMissingGlobalStats(appids);
    for (const appid of missingGlobal) {
      await this.queue.add(
        'sync-global-achievements',
        { appid },
        { jobId: `global-ach-${appid}-${Date.now()}`, priority: 10 },
      );
    }
  }
}
