import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SteamSpyCache, SteamSpyCacheDocument } from './schemas/steam-spy-cache.schema';
import { Game, GameDocument } from '../catalog/schemas/game.schema';
import { SteamSpyAppDetails } from '../steamspy-api/steamspy-api.service';

const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_TAGS = 20;

/** SteamSpy sends `[]` when a game has no tags, an object of tag→votes otherwise. */
function extractTopTags(tags: SteamSpyAppDetails['tags']): string[] {
  if (!tags || Array.isArray(tags)) return [];
  return Object.entries(tags)
    .filter(([, votes]) => typeof votes === 'number')
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TAGS)
    .map(([name]) => name);
}

@Injectable()
export class SteamSpyService {
  constructor(
    @InjectModel(SteamSpyCache.name) private readonly cacheModel: Model<SteamSpyCacheDocument>,
    @InjectModel(Game.name) private readonly gameModel: Model<GameDocument>,
  ) {}

  async findStaleOrMissing(appids: number[]): Promise<number[]> {
    const cutoff = new Date(Date.now() - STALE_AFTER_MS);
    // `tags: $exists` re-flags pre-migration cache entries written before tag
    // capture existed; post-migration writes always set the field (possibly
    // as an empty array), so genuinely tagless games aren't refetched forever.
    const fresh = await this.cacheModel
      .find({ appid: { $in: appids }, fetchedAt: { $gte: cutoff }, tags: { $exists: true } }, { appid: 1 })
      .lean()
      .exec();
    const freshSet = new Set(fresh.map((c) => c.appid));
    return appids.filter((id) => !freshSet.has(id));
  }

  async upsertFromDetails(appid: number, details: SteamSpyAppDetails): Promise<void> {
    const tags = extractTopTags(details.tags);

    await this.cacheModel
      .findOneAndUpdate(
        { appid },
        {
          appid,
          ownersRangeLabel: details.owners,
          avgPlaytimeForever: details.average_forever,
          avgPlaytime2Weeks: details.average_2weeks,
          tags,
          positive: details.positive ?? 0,
          negative: details.negative ?? 0,
          ccu: details.ccu ?? 0,
          fetchedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    // Steam's own appdetails response carries no community tags, so the
    // catalog's `tags` field is only ever fed from here. Written even when
    // the game document doesn't exist yet (store-sync may still be queued);
    // no upsert — a tags-only stub without name/price would break the catalog.
    if (tags.length > 0) {
      await this.gameModel.updateOne({ appid }, { $set: { tags } }).exec();
    }
  }

  findForAppids(appids: number[]): Promise<SteamSpyCacheDocument[]> {
    return this.cacheModel.find({ appid: { $in: appids } }).exec();
  }
}
