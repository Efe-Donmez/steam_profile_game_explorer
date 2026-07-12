import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SteamLibrary, SteamLibraryDocument } from '../steam/schemas/steam-library.schema';
import { Game, GameDocument } from '../catalog/schemas/game.schema';
import { GameReview, GameReviewDocument } from '../reviews/schemas/game-review.schema';
import { GameAchievement, GameAchievementDocument } from '../achievements/schemas/game-achievement.schema';
import {
  GlobalAchievementStat,
  GlobalAchievementStatDocument,
} from '../achievements/schemas/global-achievement-stat.schema';
import { SteamSpyCache, SteamSpyCacheDocument } from '../steamspy/schemas/steam-spy-cache.schema';
import { PlaytimeSnapshot, PlaytimeSnapshotDocument } from '../steam/schemas/playtime-snapshot.schema';
import { UserProfile, UserProfileDocument } from './schemas/user-profile.schema';
import { CATEGORY_FEATURE_MATCHERS, emptyFeatureCounts } from '../catalog/category-feature.util';

const METACRITIC_BUCKETS = ['0-49', '50-59', '60-69', '70-79', '80-89', '90-100', 'unrated'] as const;

const WEEKLY_TREND_WEEKS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Monday-anchored ISO date (YYYY-MM-DD) for the calendar week containing `date`. */
function mondayOf(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() || 7; // Sunday (0) -> 7
  if (dayOfWeek > 1) d.setUTCDate(d.getUTCDate() - (dayOfWeek - 1));
  return d.toISOString().slice(0, 10);
}

function emptyWeeklyBuckets(weeks: number): { weekStart: string; minutes: number }[] {
  const buckets: { weekStart: string; minutes: number }[] = [];
  const now = new Date();
  for (let i = weeks - 1; i >= 0; i--) {
    buckets.push({ weekStart: mondayOf(new Date(now.getTime() - i * 7 * DAY_MS)), minutes: 0 });
  }
  return buckets;
}

// Review-percentage preference ignores games with fewer total reviews than
// this — 3 reviews at 100% would otherwise skew the average hard.
const MIN_REVIEWS_FOR_PREFERENCE = 10;

const VALUE_LEAGUE_SIZE = 5;
const RECENT_TEMPO_TOP = 3;

// Owner-count normalization range for the niche/mainstream gauge: a Steam
// game's estimated owner count rarely falls outside roughly 1k..200M.
const NICHE_MIN_OWNERS = 1_000;
const NICHE_MAX_OWNERS = 200_000_000;

function metacriticBucket(score: number | undefined): (typeof METACRITIC_BUCKETS)[number] {
  if (score === undefined) return 'unrated';
  if (score < 50) return '0-49';
  if (score < 60) return '50-59';
  if (score < 70) return '60-69';
  if (score < 80) return '70-79';
  if (score < 90) return '80-89';
  return '90-100';
}

function reviewSentimentBucket(desc: string | undefined): 'excellent' | 'positive' | 'mixed' | 'negative' | null {
  if (!desc) return null;
  const d = desc.toLowerCase();
  if (d.includes('overwhelmingly positive') || d.includes('very positive')) return 'excellent';
  if (d.includes('positive')) return 'positive';
  if (d.includes('mixed')) return 'mixed';
  if (d.includes('negative')) return 'negative';
  return null;
}

function parseOwnersMidpoint(label: string | undefined): number | null {
  if (!label) return null;
  const numbers = label.match(/[\d,]+/g);
  if (!numbers || numbers.length === 0) return null;
  const parsed = numbers.map((n) => parseInt(n.replace(/,/g, ''), 10)).filter((n) => !Number.isNaN(n));
  if (parsed.length === 0) return null;
  return parsed.reduce((sum, n) => sum + n, 0) / parsed.length;
}

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(SteamLibrary.name) private readonly libraryModel: Model<SteamLibraryDocument>,
    @InjectModel(Game.name) private readonly gameModel: Model<GameDocument>,
    @InjectModel(GameReview.name) private readonly reviewModel: Model<GameReviewDocument>,
    @InjectModel(GameAchievement.name) private readonly achievementModel: Model<GameAchievementDocument>,
    @InjectModel(GlobalAchievementStat.name)
    private readonly globalAchievementModel: Model<GlobalAchievementStatDocument>,
    @InjectModel(SteamSpyCache.name) private readonly steamSpyModel: Model<SteamSpyCacheDocument>,
    @InjectModel(PlaytimeSnapshot.name) private readonly playtimeSnapshotModel: Model<PlaytimeSnapshotDocument>,
    @InjectModel(UserProfile.name) private readonly profileModel: Model<UserProfileDocument>,
  ) {}

  /**
   * "Son Haftalar" trend: Steam's API only exposes lifetime total playtime
   * and a rolling 2-week total, never real history, so this is derived from
   * the daily `playtimeSnapshots` accumulated by each library sync run (see
   * LibrarySyncService.syncLibrary). Consecutive snapshot totals are
   * subtracted to get "minutes played between two sync runs", then bucketed
   * into calendar weeks. Needs at least two sync runs to produce a delta —
   * brand new accounts see `hasEnoughData: false` until then.
   */
  async getWeeklyPlaytimeTrend(
    userId: string,
  ): Promise<{ hasEnoughData: boolean; weeks: { weekStart: string; minutes: number }[] }> {
    const cutoff = new Date(Date.now() - (WEEKLY_TREND_WEEKS + 1) * 7 * DAY_MS);
    const snapshots = await this.playtimeSnapshotModel
      .find({ userId: new Types.ObjectId(userId), capturedAt: { $gte: cutoff } })
      .lean()
      .exec();

    // Snapshots from the same sync run share an identical capturedAt
    // timestamp; summing per-game minutes within a run gives one
    // lifetime-total-at-that-point-in-time data point per run.
    const totalsByRun = new Map<number, number>();
    for (const s of snapshots) {
      const key = s.capturedAt.getTime();
      totalsByRun.set(key, (totalsByRun.get(key) ?? 0) + s.playtimeForeverMinutes);
    }
    const runs = Array.from(totalsByRun.entries())
      .map(([time, minutes]) => ({ time, minutes }))
      .sort((a, b) => a.time - b.time);

    const weeks = emptyWeeklyBuckets(WEEKLY_TREND_WEEKS);
    if (runs.length < 2) {
      return { hasEnoughData: false, weeks };
    }

    const bucketByWeekStart = new Map(weeks.map((w) => [w.weekStart, w]));
    for (let i = 1; i < runs.length; i++) {
      const delta = Math.max(0, runs[i].minutes - runs[i - 1].minutes);
      const bucket = bucketByWeekStart.get(mondayOf(new Date(runs[i].time)));
      if (bucket) bucket.minutes += delta;
    }

    return { hasEnoughData: true, weeks };
  }

  async getOrBuildProfile(userId: string): Promise<UserProfileDocument> {
    return this.buildUserProfile(userId);
  }

  async buildUserProfile(userId: string): Promise<UserProfileDocument> {
    const library = await this.libraryModel.find({ userId: new Types.ObjectId(userId) }).lean().exec();
    const profileData = await this.computeProfileData(userId, library);

    return this.profileModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { ...profileData, userId: new Types.ObjectId(userId) },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  /**
   * Same DNA computation as `buildUserProfile`, but for a Steam friend who
   * has never logged into SteamCompass: no `userId` (so no achievements —
   * those require an authenticated per-user Steam call this guest never
   * made) and `library` comes from a live/cached `GetOwnedGames` snapshot
   * instead of the `steamLibraries` collection. Returned as a plain object
   * (never persisted to `userProfiles` — that collection is reserved for
   * consented, logged-in accounts per CLAUDE.md §6).
   */
  async buildGuestProfileData(
    library: { appid: number; playtimeForeverMinutes: number; playtime2WeeksMinutes?: number; lastPlayed?: Date }[],
  ): Promise<Record<string, unknown>> {
    return this.computeProfileData(null, library);
  }

  private async computeProfileData(
    userId: string | null,
    library: { appid: number; playtimeForeverMinutes: number; playtime2WeeksMinutes?: number; lastPlayed?: Date }[],
  ): Promise<Record<string, unknown>> {
    const appids = library.map((l) => l.appid);
    const totalGames = library.length;
    const totalPlaytimeMinutes = library.reduce((sum, l) => sum + (l.playtimeForeverMinutes ?? 0), 0);

    const [games, reviews, achievements, globalStats, steamSpyEntries] = await Promise.all([
      this.gameModel.find({ appid: { $in: appids } }).lean().exec(),
      this.reviewModel.find({ appid: { $in: appids } }).lean().exec(),
      userId
        ? this.achievementModel.find({ userId: new Types.ObjectId(userId), appid: { $in: appids } }).lean().exec()
        : Promise.resolve([]),
      userId ? this.globalAchievementModel.find({ appid: { $in: appids } }).lean().exec() : Promise.resolve([]),
      this.steamSpyModel.find({ appid: { $in: appids } }).lean().exec(),
    ]);

    const gameByAppid = new Map(games.map((g) => [g.appid, g]));
    const reviewByAppid = new Map(reviews.map((r) => [r.appid, r]));
    const globalStatsByAppid = new Map(globalStats.map((s) => [s.appid, s]));

    const genreWeights: Record<string, number> = {};
    const tagWeights: Record<string, number> = {};
    const featureCounts = emptyFeatureCounts();
    const metacriticHistogram: Record<string, number> = Object.fromEntries(
      METACRITIC_BUCKETS.map((b) => [b, 0]),
    );
    const releaseYearHistogram: Record<string, number> = {};
    const reviewSentimentBuckets = { excellent: 0, positive: 0, mixed: 0, negative: 0 };

    // SteamSpy tags reach `games.tags` asynchronously; while a game's catalog
    // entry still has none, fall back to its steamSpyCache entry so the TAG
    // orbit fills as soon as either source has data.
    const spyByAppid = new Map(steamSpyEntries.map((s) => [s.appid, s]));

    let totalEstimatedSpendCents = 0;
    let libraryValueCents = 0;
    const currencyCounts: Record<string, number> = {};
    let paidPriceKnownSum = 0;
    let paidPriceKnownCount = 0;
    let metacriticScoreSum = 0;
    let metacriticScoreCount = 0;
    let reviewPercentSum = 0;
    let reviewPercentCount = 0;
    let neverPlayedCount = 0;
    let neverPlayedValueCents = 0;
    let freeGameCount = 0;
    let paidGameCount = 0;
    const platformCounts = { windows: 0, mac: 0, linux: 0 };
    const releaseYears: number[] = [];
    const valueEntries: {
      appid: number;
      name: string;
      headerImage?: string;
      capsuleImage?: string;
      basePriceCents: number;
      hours: number;
      centsPerHour: number;
    }[] = [];

    for (const lib of library) {
      const game = gameByAppid.get(lib.appid);
      const weight = Math.log(lib.playtimeForeverMinutes + 1);

      if (game) {
        for (const genre of game.genres ?? []) {
          genreWeights[genre] = (genreWeights[genre] ?? 0) + weight;
        }
        const tags = game.tags?.length ? game.tags : (spyByAppid.get(lib.appid)?.tags ?? []);
        for (const tag of tags) {
          tagWeights[tag] = (tagWeights[tag] ?? 0) + weight;
        }

        // Spend estimate uses the undiscounted base price — closest available
        // proxy for "what was paid" without purchase history. Older catalog
        // entries fetched before basePriceCents existed fall back to the
        // current price rather than 0.
        const basePrice = game.isFree ? 0 : (game.basePriceCents || game.priceCents || 0);
        const currentPrice = game.isFree ? 0 : (game.priceCents ?? 0);
        totalEstimatedSpendCents += basePrice;
        libraryValueCents += currentPrice;
        if (game.currency) {
          currencyCounts[game.currency] = (currencyCounts[game.currency] ?? 0) + 1;
        }

        if (game.isFree) {
          freeGameCount += 1;
        } else {
          paidGameCount += 1;
          if (basePrice > 0) {
            paidPriceKnownSum += basePrice;
            paidPriceKnownCount += 1;
          }
        }

        if (lib.playtimeForeverMinutes === 0) {
          neverPlayedCount += 1;
          neverPlayedValueCents += basePrice;
        } else if (basePrice > 0) {
          const hours = lib.playtimeForeverMinutes / 60;
          valueEntries.push({
            appid: lib.appid,
            name: game.name,
            headerImage: game.headerImage,
            capsuleImage: game.capsuleImage,
            basePriceCents: basePrice,
            hours: Math.round(hours * 10) / 10,
            centsPerHour: Math.round(basePrice / hours),
          });
        }

        if (game.platforms?.windows) platformCounts.windows += 1;
        if (game.platforms?.mac) platformCounts.mac += 1;
        if (game.platforms?.linux) platformCounts.linux += 1;

        if (game.metacriticScore !== undefined) {
          metacriticScoreSum += game.metacriticScore;
          metacriticScoreCount += 1;
        }
        metacriticHistogram[metacriticBucket(game.metacriticScore)] += 1;

        if (game.releaseYear !== undefined) {
          releaseYearHistogram[game.releaseYear] = (releaseYearHistogram[game.releaseYear] ?? 0) + 1;
          releaseYears.push(game.releaseYear);
        }

        for (const category of game.categories ?? []) {
          for (const matcher of CATEGORY_FEATURE_MATCHERS) {
            if (matcher.test.test(category)) {
              featureCounts[matcher.key] += 1;
            }
          }
        }
      } else {
        metacriticHistogram.unrated += 1;
        if (lib.playtimeForeverMinutes === 0) {
          neverPlayedCount += 1;
        }
      }

      const review = reviewByAppid.get(lib.appid);
      if (review && review.totalPositive + review.totalNegative > 0) {
        const totalVotes = review.totalPositive + review.totalNegative;
        if (totalVotes >= MIN_REVIEWS_FOR_PREFERENCE) {
          reviewPercentSum += (review.totalPositive / totalVotes) * 100;
          reviewPercentCount += 1;
        }

        const bucket = reviewSentimentBucket(review.reviewScoreDesc);
        if (bucket) {
          reviewSentimentBuckets[bucket] += 1;
        }
      }
    }

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const playtimeBuckets = { never: 0, under1h: 0, h1to5: 0, h5to20: 0, h20to100: 0, over100h: 0 };
    const recencyBuckets = { last2Weeks: 0, lastMonth: 0, last6Months: 0, lastYear: 0, older: 0, unknown: 0 };
    for (const lib of library) {
      const hours = lib.playtimeForeverMinutes / 60;
      if (lib.playtimeForeverMinutes === 0) playtimeBuckets.never += 1;
      else if (hours < 1) playtimeBuckets.under1h += 1;
      else if (hours < 5) playtimeBuckets.h1to5 += 1;
      else if (hours < 20) playtimeBuckets.h5to20 += 1;
      else if (hours < 100) playtimeBuckets.h20to100 += 1;
      else playtimeBuckets.over100h += 1;

      // Recency only makes sense for games that were ever launched; games
      // without a lastPlayed record land in `unknown`.
      if (lib.playtimeForeverMinutes === 0) continue;
      if (!lib.lastPlayed) {
        recencyBuckets.unknown += 1;
        continue;
      }
      const age = now - lib.lastPlayed.getTime();
      if (age <= 14 * DAY_MS) recencyBuckets.last2Weeks += 1;
      else if (age <= 30 * DAY_MS) recencyBuckets.lastMonth += 1;
      else if (age <= 182 * DAY_MS) recencyBuckets.last6Months += 1;
      else if (age <= 365 * DAY_MS) recencyBuckets.lastYear += 1;
      else recencyBuckets.older += 1;
    }

    const perfectGamesCount = achievements.filter(
      (a) => a.completionPercent === 100 && a.achievements.length > 0,
    ).length;
    const totalAchievementsUnlocked = achievements.reduce(
      (sum, a) => sum + a.achievements.filter((e) => e.achieved).length,
      0,
    );

    const totalHoursPlayed = totalPlaytimeMinutes / 60;
    const overallCostPerHourCents = totalHoursPlayed > 0 ? Math.round(totalEstimatedSpendCents / totalHoursPlayed) : 0;

    const sortedByValue = [...valueEntries].sort((a, b) => a.centsPerHour - b.centsPerHour);
    const bestValueGames = sortedByValue.slice(0, VALUE_LEAGUE_SIZE);
    const worstValueGames = sortedByValue.slice(-VALUE_LEAGUE_SIZE).reverse();

    const recentGames = library
      .filter((l) => (l.playtime2WeeksMinutes ?? 0) > 0)
      .sort((a, b) => (b.playtime2WeeksMinutes ?? 0) - (a.playtime2WeeksMinutes ?? 0));
    const recentTempo = {
      games2Weeks: recentGames.length,
      minutes2Weeks: recentGames.reduce((sum, l) => sum + (l.playtime2WeeksMinutes ?? 0), 0),
      topRecent: recentGames.slice(0, RECENT_TEMPO_TOP).map((l) => {
        const game = gameByAppid.get(l.appid);
        return {
          appid: l.appid,
          name: game?.name ?? `App ${l.appid}`,
          headerImage: game?.headerImage,
          capsuleImage: game?.capsuleImage,
          minutes2Weeks: l.playtime2WeeksMinutes ?? 0,
        };
      }),
    };

    const sortedYears = [...releaseYears].sort((a, b) => a - b);
    const oldestGameYear = sortedYears[0];
    const newestGameYear = sortedYears[sortedYears.length - 1];
    const medianReleaseYear = sortedYears.length > 0 ? sortedYears[Math.floor(sortedYears.length / 2)] : undefined;

    const platformCoverage = {
      windows: totalGames > 0 ? Math.round((platformCounts.windows / totalGames) * 100) : 0,
      mac: totalGames > 0 ? Math.round((platformCounts.mac / totalGames) * 100) : 0,
      linux: totalGames > 0 ? Math.round((platformCounts.linux / totalGames) * 100) : 0,
    };

    const coverage = {
      catalog: { fetched: games.length, total: totalGames },
      reviews: { fetched: reviews.length, total: totalGames },
      achievements: { fetched: achievements.length, total: totalGames },
      steamSpy: { fetched: steamSpyEntries.length, total: totalGames },
    };

    const featureCoverage = {
      multiplayer: totalGames > 0 ? Math.round((featureCounts.multiplayer / totalGames) * 100) : 0,
      coop: totalGames > 0 ? Math.round((featureCounts.coop / totalGames) * 100) : 0,
      controller: totalGames > 0 ? Math.round((featureCounts.controller / totalGames) * 100) : 0,
      cloudSave: totalGames > 0 ? Math.round((featureCounts.cloudSave / totalGames) * 100) : 0,
      achievements: totalGames > 0 ? Math.round((featureCounts.achievements / totalGames) * 100) : 0,
      singleplayer: totalGames > 0 ? Math.round((featureCounts.singleplayer / totalGames) * 100) : 0,
    };

    const ownerMidpoints = appids
      .map((appid) => steamSpyEntries.find((s) => s.appid === appid))
      .filter((s): s is SteamSpyCacheDocument => !!s)
      .map((s) => parseOwnersMidpoint(s.ownersRangeLabel))
      .filter((n): n is number => n !== null);

    let nicheScore = 50;
    if (ownerMidpoints.length > 0) {
      const avgOwners = ownerMidpoints.reduce((sum, n) => sum + n, 0) / ownerMidpoints.length;
      const clamped = Math.min(Math.max(avgOwners, NICHE_MIN_OWNERS), NICHE_MAX_OWNERS);
      const logRatio =
        (Math.log10(clamped) - Math.log10(NICHE_MIN_OWNERS)) /
        (Math.log10(NICHE_MAX_OWNERS) - Math.log10(NICHE_MIN_OWNERS));
      nicheScore = Math.round(100 - logRatio * 100);
    }

    const achievementCompletions = achievements.map((a) => a.completionPercent);
    const avgAchievementCompletion =
      achievementCompletions.length > 0
        ? Math.round(achievementCompletions.reduce((sum, c) => sum + c, 0) / achievementCompletions.length)
        : 0;

    const rarestAchievements = achievements
      .flatMap((gameAchievement) =>
        gameAchievement.achievements
          .filter((a) => a.achieved)
          .map((a) => {
            const globalStat = globalStatsByAppid.get(gameAchievement.appid);
            const globalEntry = globalStat?.achievements.find((g) => g.apiName === a.apiName);
            const game = gameByAppid.get(gameAchievement.appid);
            return globalEntry
              ? {
                  appid: gameAchievement.appid,
                  gameName: game?.name ?? `App ${gameAchievement.appid}`,
                  headerImage: game?.headerImage,
                  capsuleImage: game?.capsuleImage,
                  apiName: a.apiName,
                  displayName: a.displayName ?? a.apiName,
                  unlockTime: a.unlockTime,
                  globalUnlockPercent: globalEntry.globalUnlockPercent,
                }
              : null;
          }),
      )
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => a.globalUnlockPercent - b.globalUnlockPercent)
      .slice(0, 5);

    const profileData = {
      genreWeights,
      tagWeights,
      totalGames,
      totalPlaytimeMinutes,
      totalEstimatedSpendCents,
      currency: Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0],
      libraryValueCents,
      // Average over paid games with a known price only — free games and
      // not-yet-fetched catalog entries used to drag this toward zero.
      avgPricePaid: paidPriceKnownCount > 0 ? Math.round(paidPriceKnownSum / paidPriceKnownCount) : 0,
      avgMetacriticPreference: metacriticScoreCount > 0 ? Math.round(metacriticScoreSum / metacriticScoreCount) : 0,
      avgReviewScorePreference: reviewPercentCount > 0 ? Math.round(reviewPercentSum / reviewPercentCount) : 0,
      featureCoverage,
      nicheScore,
      avgAchievementCompletion,
      rarestAchievements,
      releaseYearHistogram,
      metacriticHistogram,
      reviewSentimentBuckets,
      neverPlayedCount,
      neverPlayedValueCents,
      freeGameCount,
      paidGameCount,
      bestValueGames,
      worstValueGames,
      recentTempo,
      platformCoverage,
      oldestGameYear,
      newestGameYear,
      medianReleaseYear,
      coverage,
      playtimeBuckets,
      recencyBuckets,
      perfectGamesCount,
      totalAchievementsUnlocked,
      overallCostPerHourCents,
    };

    return profileData;
  }

  async getValueMap(userId: string): Promise<
    { appid: number; name: string; priceCents: number; hours: number; isFree: boolean; genre?: string }[]
  > {
    const library = await this.libraryModel.find({ userId: new Types.ObjectId(userId) }).lean().exec();
    const appids = library.map((l) => l.appid);
    const games = await this.gameModel.find({ appid: { $in: appids } }).lean().exec();
    const gameByAppid = new Map(games.map((g) => [g.appid, g]));

    return library
      .map((l) => {
        const game = gameByAppid.get(l.appid);
        if (!game) return null;
        return {
          appid: l.appid,
          name: game.name,
          priceCents: game.isFree ? 0 : (game.basePriceCents || game.priceCents || 0),
          hours: Math.round((l.playtimeForeverMinutes / 60) * 10) / 10,
          isFree: game.isFree,
          genre: game.genres?.[0],
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }

  async getTopGames(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    total: number;
    items: {
      appid: number;
      name: string;
      genres: string[];
      headerImage?: string;
      capsuleImage?: string;
      metacriticScore?: number;
      lastPlayed?: Date;
      hours: number;
    }[];
  }> {
    const library = await this.libraryModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ playtimeForeverMinutes: -1 })
      .lean()
      .exec();
    const total = library.length;
    const page_ = library.slice((page - 1) * limit, (page - 1) * limit + limit);
    const games = await this.gameModel
      .find({ appid: { $in: page_.map((l) => l.appid) } })
      .lean()
      .exec();
    const gameByAppid = new Map(games.map((g) => [g.appid, g]));

    const items = page_.map((l) => {
      const game = gameByAppid.get(l.appid);
      return {
        appid: l.appid,
        name: game?.name ?? `App ${l.appid}`,
        genres: game?.genres ?? [],
        headerImage: game?.headerImage,
        capsuleImage: game?.capsuleImage,
        metacriticScore: game?.metacriticScore,
        lastPlayed: l.lastPlayed,
        hours: Math.round((l.playtimeForeverMinutes / 60) * 10) / 10,
      };
    });

    return { total, items };
  }

  /** Guest-view counterpart of `getTopGames`, sorting an in-memory owned-games snapshot instead of `steamLibraries`. */
  async getGuestTopGames(
    library: { appid: number; playtimeForeverMinutes: number; lastPlayed?: Date }[],
    limit: number,
  ): Promise<{
    total: number;
    items: {
      appid: number;
      name: string;
      genres: string[];
      headerImage?: string;
      capsuleImage?: string;
      metacriticScore?: number;
      lastPlayed?: Date;
      hours: number;
    }[];
  }> {
    const sorted = [...library].sort((a, b) => b.playtimeForeverMinutes - a.playtimeForeverMinutes);
    const page_ = sorted.slice(0, limit);
    const games = await this.gameModel
      .find({ appid: { $in: page_.map((l) => l.appid) } })
      .lean()
      .exec();
    const gameByAppid = new Map(games.map((g) => [g.appid, g]));

    const items = page_.map((l) => {
      const game = gameByAppid.get(l.appid);
      return {
        appid: l.appid,
        name: game?.name ?? `App ${l.appid}`,
        genres: game?.genres ?? [],
        headerImage: game?.headerImage,
        capsuleImage: game?.capsuleImage,
        metacriticScore: game?.metacriticScore,
        lastPlayed: l.lastPlayed,
        hours: Math.round((l.playtimeForeverMinutes / 60) * 10) / 10,
      };
    });

    return { total: sorted.length, items };
  }

  /**
   * Filterable library browser backing every interactive chart/panel click on
   * the profile page (year bars, metacritic buckets, sentiment slices, genre
   * orbit nodes, recency/playtime buckets, never-played pile, platform bars).
   * The library is small (a few hundred docs), so filters run in memory.
   */
  async getLibraryGames(
    userId: string,
    query: {
      genre?: string;
      tag?: string;
      year?: number;
      metacriticBucket?: string;
      sentiment?: string;
      neverPlayed?: boolean;
      platform?: string;
      recency?: string;
      playtimeBucket?: string;
      search?: string;
      sort?: string;
      limit?: number;
    },
  ): Promise<{ total: number; items: Record<string, unknown>[] }> {
    const library = await this.libraryModel.find({ userId: new Types.ObjectId(userId) }).lean().exec();
    const appids = library.map((l) => l.appid);
    const [games, reviews, achievements] = await Promise.all([
      this.gameModel.find({ appid: { $in: appids } }).lean().exec(),
      this.reviewModel.find({ appid: { $in: appids } }).lean().exec(),
      this.achievementModel.find({ userId: new Types.ObjectId(userId), appid: { $in: appids } }).lean().exec(),
    ]);
    const gameByAppid = new Map(games.map((g) => [g.appid, g]));
    const reviewByAppid = new Map(reviews.map((r) => [r.appid, r]));
    const achievementByAppid = new Map(achievements.map((a) => [a.appid, a]));

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    const rows = library.map((lib) => {
      const game = gameByAppid.get(lib.appid);
      const review = reviewByAppid.get(lib.appid);
      const achievement = achievementByAppid.get(lib.appid);
      const hours = Math.round((lib.playtimeForeverMinutes / 60) * 10) / 10;
      const basePrice = game?.isFree ? 0 : (game?.basePriceCents || game?.priceCents || 0);
      return {
        appid: lib.appid,
        name: game?.name ?? `App ${lib.appid}`,
        headerImage: game?.headerImage,
        capsuleImage: game?.capsuleImage,
        genres: game?.genres ?? [],
        tags: (game?.tags ?? []).slice(0, 6),
        releaseYear: game?.releaseYear,
        metacriticScore: game?.metacriticScore,
        reviewScoreDesc: review?.reviewScoreDesc,
        reviewPositivePercent:
          review && review.totalPositive + review.totalNegative > 0
            ? Math.round((review.totalPositive / (review.totalPositive + review.totalNegative)) * 100)
            : undefined,
        isFree: game?.isFree ?? false,
        basePriceCents: basePrice,
        priceCents: game?.isFree ? 0 : (game?.priceCents ?? 0),
        platforms: game?.platforms,
        hours,
        playtime2WeeksMinutes: lib.playtime2WeeksMinutes ?? 0,
        lastPlayed: lib.lastPlayed,
        achievementCompletion: achievement?.completionPercent,
        achievementsUnlocked: achievement ? achievement.achievements.filter((a) => a.achieved).length : undefined,
        achievementsTotal: achievement?.achievements.length ?? game?.achievementsTotal,
        centsPerHour: hours > 0 && basePrice > 0 ? Math.round(basePrice / hours) : undefined,
        _game: game,
        _lib: lib,
      };
    });

    const filtered = rows.filter((row) => {
      if (query.genre && !row.genres.includes(query.genre)) return false;
      if (query.tag && !(row._game?.tags ?? []).includes(query.tag)) return false;
      if (query.year !== undefined && row.releaseYear !== query.year) return false;
      if (query.metacriticBucket) {
        const bucket = metacriticBucket(row.metacriticScore ?? undefined);
        if (bucket !== query.metacriticBucket) return false;
      }
      if (query.sentiment) {
        const bucket = reviewSentimentBucket(row.reviewScoreDesc);
        if (bucket !== query.sentiment) return false;
      }
      if (query.neverPlayed && row._lib.playtimeForeverMinutes > 0) return false;
      if (query.platform) {
        const platforms = row.platforms as Record<string, boolean> | undefined;
        if (!platforms?.[query.platform]) return false;
      }
      if (query.recency) {
        if (row._lib.playtimeForeverMinutes === 0) return false;
        const last = row._lib.lastPlayed?.getTime();
        const age = last !== undefined ? now - last : undefined;
        const bucket =
          age === undefined
            ? 'unknown'
            : age <= 14 * DAY_MS
              ? 'last2Weeks'
              : age <= 30 * DAY_MS
                ? 'lastMonth'
                : age <= 182 * DAY_MS
                  ? 'last6Months'
                  : age <= 365 * DAY_MS
                    ? 'lastYear'
                    : 'older';
        if (bucket !== query.recency) return false;
      }
      if (query.playtimeBucket) {
        const hours = row._lib.playtimeForeverMinutes / 60;
        const bucket =
          row._lib.playtimeForeverMinutes === 0
            ? 'never'
            : hours < 1
              ? 'under1h'
              : hours < 5
                ? 'h1to5'
                : hours < 20
                  ? 'h5to20'
                  : hours < 100
                    ? 'h20to100'
                    : 'over100h';
        if (bucket !== query.playtimeBucket) return false;
      }
      if (query.search && !row.name.toLowerCase().includes(query.search.toLowerCase())) return false;
      return true;
    });

    const sortKey = query.sort ?? 'hours';
    filtered.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name, 'tr');
        case 'lastPlayed':
          return (b.lastPlayed?.getTime() ?? 0) - (a.lastPlayed?.getTime() ?? 0);
        case 'price':
          return b.basePriceCents - a.basePriceCents;
        case 'completion':
          return (b.achievementCompletion ?? -1) - (a.achievementCompletion ?? -1);
        case 'metacritic':
          return (b.metacriticScore ?? 0) - (a.metacriticScore ?? 0);
        case 'hours':
        default:
          return b.hours - a.hours;
      }
    });

    const limit = Math.min(query.limit ?? 500, 500);
    const items = filtered.slice(0, limit).map(({ _game, _lib, ...row }) => row);
    return { total: filtered.length, items };
  }

  /** Single-game deep dive for the profile drawer. */
  async getGameDetail(userId: string, appid: number): Promise<Record<string, unknown> | null> {
    const [lib, game, review, achievement, globalStat, spy] = await Promise.all([
      this.libraryModel.findOne({ userId: new Types.ObjectId(userId), appid }).lean().exec(),
      this.gameModel.findOne({ appid }).lean().exec(),
      this.reviewModel.findOne({ appid }).lean().exec(),
      this.achievementModel.findOne({ userId: new Types.ObjectId(userId), appid }).lean().exec(),
      this.globalAchievementModel.findOne({ appid }).lean().exec(),
      this.steamSpyModel.findOne({ appid }).lean().exec(),
    ]);
    if (!lib && !game) return null;

    const globalByApiName = new Map((globalStat?.achievements ?? []).map((g) => [g.apiName, g.globalUnlockPercent]));
    const unlocked = (achievement?.achievements ?? [])
      .filter((a) => a.achieved)
      .map((a) => ({
        apiName: a.apiName,
        displayName: a.displayName ?? a.apiName,
        unlockTime: a.unlockTime,
        globalUnlockPercent: globalByApiName.get(a.apiName),
      }))
      .sort((a, b) => (a.globalUnlockPercent ?? 100) - (b.globalUnlockPercent ?? 100));

    // Full achievement list (locked + unlocked), rarest-first, for the
    // dedicated game detail page's SteamDB-style achievement section.
    const allAchievements = (achievement?.achievements ?? [])
      .map((a) => ({
        apiName: a.apiName,
        displayName: a.displayName ?? a.apiName,
        achieved: a.achieved,
        unlockTime: a.unlockTime,
        globalUnlockPercent: globalByApiName.get(a.apiName),
      }))
      .sort((a, b) => (a.globalUnlockPercent ?? 100) - (b.globalUnlockPercent ?? 100));

    const hours = lib ? Math.round((lib.playtimeForeverMinutes / 60) * 10) / 10 : 0;
    const basePrice = game?.isFree ? 0 : (game?.basePriceCents || game?.priceCents || 0);

    return {
      appid,
      owned: !!lib,
      name: game?.name ?? `App ${appid}`,
      headerImage: game?.headerImage,
      capsuleImage: game?.capsuleImage,
      backgroundImage: game?.backgroundImage,
      screenshots: game?.screenshots ?? [],
      shortDescription: game?.shortDescription,
      genres: game?.genres ?? [],
      tags: game?.tags ?? [],
      categories: game?.categories ?? [],
      developers: game?.developers ?? [],
      publishers: game?.publishers ?? [],
      releaseDate: game?.releaseDate,
      releaseYear: game?.releaseYear,
      metacriticScore: game?.metacriticScore,
      recommendationsTotal: game?.recommendationsTotal,
      controllerSupport: game?.controllerSupport,
      dlcCount: game?.dlcCount ?? 0,
      platforms: game?.platforms,
      isFree: game?.isFree ?? false,
      priceCents: game?.isFree ? 0 : (game?.priceCents ?? 0),
      basePriceCents: basePrice,
      discountPercent: game?.discountPercent ?? 0,
      currency: game?.currency,
      reviewScoreDesc: review?.reviewScoreDesc,
      totalReviews: review?.totalReviews,
      reviewPositivePercent:
        review && review.totalPositive + review.totalNegative > 0
          ? Math.round((review.totalPositive / (review.totalPositive + review.totalNegative)) * 100)
          : undefined,
      hours,
      playtime2WeeksMinutes: lib?.playtime2WeeksMinutes ?? 0,
      lastPlayed: lib?.lastPlayed,
      centsPerHour: hours > 0 && basePrice > 0 ? Math.round(basePrice / hours) : undefined,
      achievementCompletion: achievement?.completionPercent,
      achievementsUnlocked: achievement ? achievement.achievements.filter((a) => a.achieved).length : undefined,
      achievementsTotal: achievement?.achievements.length ?? game?.achievementsTotal,
      rarestUnlocked: unlocked.slice(0, 5),
      allAchievements,
      steamSpy: spy
        ? { ownersRangeLabel: spy.ownersRangeLabel, ccu: spy.ccu ?? 0, tags: (spy.tags ?? []).slice(0, 10) }
        : null,
    };
  }

  async getTopStudios(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ total: number; items: { name: string; gameCount: number; totalHours: number }[] }> {
    const library = await this.libraryModel.find({ userId: new Types.ObjectId(userId) }).lean().exec();
    const appids = library.map((l) => l.appid);
    const games = await this.gameModel.find({ appid: { $in: appids } }).lean().exec();
    const gameByAppid = new Map(games.map((g) => [g.appid, g]));

    const studioStats = new Map<string, { gameCount: number; totalMinutes: number }>();
    for (const lib of library) {
      const game = gameByAppid.get(lib.appid);
      for (const developer of game?.developers ?? []) {
        const stats = studioStats.get(developer) ?? { gameCount: 0, totalMinutes: 0 };
        stats.gameCount += 1;
        stats.totalMinutes += lib.playtimeForeverMinutes;
        studioStats.set(developer, stats);
      }
    }

    const sorted = Array.from(studioStats.entries())
      .map(([name, stats]) => ({
        name,
        gameCount: stats.gameCount,
        totalHours: Math.round((stats.totalMinutes / 60) * 10) / 10,
      }))
      .sort((a, b) => b.gameCount - a.gameCount || b.totalHours - a.totalHours);

    const total = sorted.length;
    const items = sorted.slice((page - 1) * limit, (page - 1) * limit + limit);
    return { total, items };
  }
}
