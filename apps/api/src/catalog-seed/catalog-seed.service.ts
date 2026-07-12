import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Game, GameDocument } from '../catalog/schemas/game.schema';
import { UserProfile, UserProfileDocument } from '../profile/schemas/user-profile.schema';
import { SteamSpyApiService } from '../steamspy-api/steamspy-api.service';
import { StoreSyncService } from '../store-sync/store-sync.service';
import { SteamSpySyncService } from '../steamspy/steamspy-sync.service';

// The games catalog is otherwise populated only from users' own libraries,
// which makes the recommendation candidate pool ($nin ownedAppids) empty for
// a single-user install. Seeding pulls popular titles from SteamSpy's charts
// plus the users' favourite genres so there is always something to recommend.

// Below this many catalog entries the pool is too thin to recommend from;
// bootstrap triggers an immediate seed.
const MIN_CATALOG_SIZE = 500;

// Per-run cap on newly enqueued games. Each seeded game costs 2 store-API
// jobs (appdetails + reviews, shared 1.7s limiter) + 1 SteamSpy job, so 400
// keeps a full seed run under ~25 minutes of background queue time.
const MAX_SEEDS_PER_RUN = 400;

const GENRE_SEED_CAP = 150;
const TOP_GENRES_TO_SEED = 5;

// Catalog genres are stored localized (appdetails is fetched with l=turkish)
// but SteamSpy's genre endpoint expects the English names.
const GENRE_TR_TO_EN: Record<string, string> = {
  Aksiyon: 'Action',
  Macera: 'Adventure',
  Strateji: 'Strategy',
  'Rol Yapma': 'RPG',
  Simülasyon: 'Simulation',
  Spor: 'Sports',
  Yarış: 'Racing',
  'Bağımsız Yapımcı': 'Indie',
  Sıradan: 'Casual',
  'Devasa Çok Oyunculu': 'Massively Multiplayer',
  'Ücretsiz Oynanış': 'Free to Play',
  'Oynaması Ücretsiz': 'Free to Play',
};

@Injectable()
export class CatalogSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CatalogSeedService.name);
  private running = false;

  constructor(
    @InjectModel(Game.name) private readonly gameModel: Model<GameDocument>,
    @InjectModel(UserProfile.name) private readonly profileModel: Model<UserProfileDocument>,
    private readonly steamSpyApi: SteamSpyApiService,
    private readonly storeSyncService: StoreSyncService,
    private readonly steamSpySyncService: SteamSpySyncService,
  ) {}

  onApplicationBootstrap(): void {
    void this.seedIfCatalogThin();
  }

  private async seedIfCatalogThin(): Promise<void> {
    const count = await this.gameModel.estimatedDocumentCount().exec();
    if (count >= MIN_CATALOG_SIZE) return;
    this.logger.log(`Katalog küçük (${count} oyun) — öneri havuzu için tohumlama başlatılıyor`);
    await this.seedCatalog();
  }

  @Cron('0 30 4 * * *')
  async dailySeed(): Promise<void> {
    await this.seedCatalog();
  }

  async seedCatalog(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const candidateAppids = await this.collectCandidateAppids();

      const existing = await this.gameModel
        .find({ appid: { $in: candidateAppids } }, { appid: 1 })
        .lean()
        .exec();
      const existingSet = new Set(existing.map((g) => g.appid));
      const toSeed = candidateAppids.filter((appid) => !existingSet.has(appid)).slice(0, MAX_SEEDS_PER_RUN);

      for (const appid of toSeed) {
        await this.storeSyncService.enqueueAppDetailsFetch(appid);
        await this.storeSyncService.enqueueReviewsFetch(appid);
      }
      // Tags for the recommendation engine come from SteamSpy; enqueueForLibrary
      // already skips fresh cache entries.
      await this.steamSpySyncService.enqueueForLibrary(toSeed);

      this.logger.log(
        `Katalog tohumlama: ${candidateAppids.length} aday, ${toSeed.length} yeni oyun kuyruğa eklendi`,
      );
    } catch (err) {
      this.logger.error(`Katalog tohumlama başarısız: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  /** Top charts first (best quality signal), then the users' favourite genres. */
  private async collectCandidateAppids(): Promise<number[]> {
    const seen = new Set<number>();
    const ordered: number[] = [];
    const push = (appid: number) => {
      if (!seen.has(appid)) {
        seen.add(appid);
        ordered.push(appid);
      }
    };

    for (const list of ['top100in2weeks', 'top100forever', 'top100owned'] as const) {
      const entries = await this.steamSpyApi.getTopList(list);
      entries.forEach((e) => push(e.appid));
      await delay(1100); // SteamSpy allows ~1 req/s
    }

    for (const genre of await this.topUserGenresEnglish()) {
      const entries = await this.steamSpyApi.getGenreList(genre);
      entries.slice(0, GENRE_SEED_CAP).forEach((e) => push(e.appid));
      await delay(1100);
    }

    return ordered;
  }

  private async topUserGenresEnglish(): Promise<string[]> {
    const profiles = await this.profileModel.find({}, { genreWeights: 1 }).lean().exec();
    const combined: Record<string, number> = {};
    for (const profile of profiles) {
      for (const [genre, weight] of Object.entries(profile.genreWeights ?? {})) {
        combined[genre] = (combined[genre] ?? 0) + weight;
      }
    }
    return Object.entries(combined)
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => GENRE_TR_TO_EN[genre] ?? null)
      .filter((g): g is string => g !== null)
      .slice(0, TOP_GENRES_TO_SEED);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
