import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GameAchievement, GameAchievementDocument } from './schemas/game-achievement.schema';
import { GlobalAchievementStat, GlobalAchievementStatDocument } from './schemas/global-achievement-stat.schema';
import { SteamGlobalAchievementEntry, SteamPlayerAchievementEntry } from '../steam-api/steam-api.service';

@Injectable()
export class AchievementsService {
  constructor(
    @InjectModel(GameAchievement.name) private readonly gameAchievementModel: Model<GameAchievementDocument>,
    @InjectModel(GlobalAchievementStat.name)
    private readonly globalStatModel: Model<GlobalAchievementStatDocument>,
  ) {}

  async upsertPlayerAchievements(
    userId: string,
    appid: number,
    achievements: SteamPlayerAchievementEntry[],
  ): Promise<void> {
    const total = achievements.length;
    const achievedCount = achievements.filter((a) => a.achieved === 1).length;
    const completionPercent = total > 0 ? Math.round((achievedCount / total) * 100) : 0;

    await this.gameAchievementModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId), appid },
        {
          achievements: achievements.map((a) => ({
            apiName: a.apiname,
            displayName: a.name,
            achieved: a.achieved === 1,
            unlockTime: a.unlocktime ? new Date(a.unlocktime * 1000) : undefined,
          })),
          completionPercent,
          syncedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async upsertGlobalStats(appid: number, entries: SteamGlobalAchievementEntry[]): Promise<void> {
    await this.globalStatModel
      .findOneAndUpdate(
        { appid },
        {
          achievements: entries.map((e) => ({ apiName: e.name, globalUnlockPercent: e.percent })),
          lastFetchedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async findMissingGlobalStats(appids: number[]): Promise<number[]> {
    const existing = await this.globalStatModel
      .find({ appid: { $in: appids } }, { appid: 1 })
      .lean()
      .exec();
    const existingSet = new Set(existing.map((s) => s.appid));
    return appids.filter((id) => !existingSet.has(id));
  }

  async findMissingOrStalePlayerAchievements(
    userId: string,
    appids: number[],
    maxAgeMs: number,
  ): Promise<number[]> {
    const cutoff = new Date(Date.now() - maxAgeMs);
    const fresh = await this.gameAchievementModel
      .find(
        { userId: new Types.ObjectId(userId), appid: { $in: appids }, syncedAt: { $gte: cutoff } },
        { appid: 1 },
      )
      .lean()
      .exec();
    const freshSet = new Set(fresh.map((a) => a.appid));
    return appids.filter((id) => !freshSet.has(id));
  }
}
