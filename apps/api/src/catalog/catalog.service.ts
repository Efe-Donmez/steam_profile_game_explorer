import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Game, GameDocument } from './schemas/game.schema';
import { SteamSpyCache, SteamSpyCacheDocument } from '../steamspy/schemas/steam-spy-cache.schema';
import { SteamAppDetails } from '../steam-api/steam-api.service';
import { extractReleaseYear } from './game-parsing.util';

@Injectable()
export class CatalogService {
  constructor(
    @InjectModel(Game.name) private readonly gameModel: Model<GameDocument>,
    @InjectModel(SteamSpyCache.name) private readonly steamSpyModel: Model<SteamSpyCacheDocument>,
  ) {}

  async findMissingOrStaleAppids(appids: number[], maxAgeMs: number): Promise<number[]> {
    const cutoff = new Date(Date.now() - maxAgeMs);
    // `basePriceCents: $exists` re-flags pre-migration documents fetched
    // before base price / capsule image capture; every post-migration upsert
    // sets it (0 for free games), so this never loops.
    const fresh = await this.gameModel
      .find(
        { appid: { $in: appids }, lastFetchedAt: { $gte: cutoff }, basePriceCents: { $exists: true } },
        { appid: 1 },
      )
      .lean()
      .exec();
    const freshSet = new Set(fresh.map((g) => g.appid));
    return appids.filter((id) => !freshSet.has(id));
  }

  async upsertFromDetails(appid: number, details: SteamAppDetails): Promise<void> {
    // Community tags only exist in the SteamSpy cache (Steam's appdetails has
    // none). SteamSpy sync may have run before this game document existed, in
    // which case its games.tags write matched nothing — backfill from the
    // cache here so ordering between the two queues doesn't lose tags.
    const spyEntry = await this.steamSpyModel.findOne({ appid }, { tags: 1 }).lean().exec();

    await this.gameModel
      .findOneAndUpdate(
        { appid },
        {
          appid,
          name: details.name,
          genres: details.genres?.map((g) => g.description) ?? [],
          categories: details.categories?.map((c) => c.description) ?? [],
          ...(spyEntry?.tags?.length ? { tags: spyEntry.tags } : {}),
          // Free-to-play titles have no `price_overview` in Steam's response
          // at all, so this must default to 0 rather than stay undefined —
          // Mongo's range operators ($gte/$lte) never match a missing field,
          // which silently dropped every free game from price-filtered results.
          priceCents: details.price_overview?.final ?? 0,
          basePriceCents: details.price_overview?.initial ?? 0,
          currency: details.price_overview?.currency,
          discountPercent: details.price_overview?.discount_percent ?? 0,
          isFree: details.is_free ?? false,
          metacriticScore: details.metacritic?.score,
          releaseDate: details.release_date?.date,
          releaseYear: extractReleaseYear(details.release_date?.date),
          headerImage: details.header_image,
          capsuleImage: details.capsule_image,
          backgroundImage: details.background,
          movieThumbnail: details.movies?.[0]?.thumbnail,
          shortDescription: details.short_description,
          screenshots: details.screenshots?.map((s) => s.path_full) ?? [],
          developers: details.developers ?? [],
          publishers: details.publishers ?? [],
          platforms: details.platforms ?? { windows: false, mac: false, linux: false },
          recommendationsTotal: details.recommendations?.total,
          achievementsTotal: details.achievements?.total,
          controllerSupport: details.controller_support,
          supportedLanguages: details.supported_languages,
          dlcCount: details.dlc?.length ?? 0,
          lastFetchedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }
}
