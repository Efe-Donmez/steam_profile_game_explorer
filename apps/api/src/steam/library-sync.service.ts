import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Model, Types } from 'mongoose';
import { Queue } from 'bullmq';
import { SteamApiService } from '../steam-api/steam-api.service';
import { CatalogService } from '../catalog/catalog.service';
import { ReviewsService } from '../reviews/reviews.service';
import { StoreSyncService } from '../store-sync/store-sync.service';
import { AchievementsSyncService } from '../achievements/achievements-sync.service';
import { SteamSpySyncService } from '../steamspy/steamspy-sync.service';
import { SyncJobsService } from '../sync-jobs/sync-jobs.service';
import { UsersService } from '../users/users.service';
import { ProfileService } from '../profile/profile.service';
import { SteamLibrary, SteamLibraryDocument } from './schemas/steam-library.schema';
import { PlaytimeSnapshot, PlaytimeSnapshotDocument } from './schemas/playtime-snapshot.schema';

export interface LibrarySyncJobData {
  userId: string;
  steamId: string;
}

const REVIEW_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const CATALOG_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class LibrarySyncService {
  private readonly logger = new Logger(LibrarySyncService.name);

  constructor(
    private readonly steamApi: SteamApiService,
    private readonly catalogService: CatalogService,
    private readonly reviewsService: ReviewsService,
    private readonly storeSyncService: StoreSyncService,
    private readonly achievementsSyncService: AchievementsSyncService,
    private readonly steamSpySyncService: SteamSpySyncService,
    private readonly syncJobs: SyncJobsService,
    private readonly usersService: UsersService,
    private readonly profileService: ProfileService,
    @InjectModel(SteamLibrary.name) private readonly libraryModel: Model<SteamLibraryDocument>,
    @InjectModel(PlaytimeSnapshot.name) private readonly playtimeSnapshotModel: Model<PlaytimeSnapshotDocument>,
    @InjectQueue('library-sync') private readonly libraryQueue: Queue<LibrarySyncJobData>,
  ) {}

  async enqueueSync(userId: string, steamId: string): Promise<void> {
    await this.libraryQueue.add(
      'sync-library',
      { userId, steamId },
      { jobId: `library-${userId}-${Date.now()}` },
    );
  }

  async syncLibrary(userId: string, steamId: string): Promise<void> {
    const job = await this.syncJobs.start(userId, 'library');
    try {
      const ownedGames = await this.steamApi.getOwnedGames(steamId);

      await Promise.all(
        ownedGames.map((g) =>
          this.libraryModel
            .findOneAndUpdate(
              { userId: new Types.ObjectId(userId), appid: g.appid },
              {
                playtimeForeverMinutes: g.playtime_forever,
                playtime2WeeksMinutes: g.playtime_2weeks ?? 0,
                // rtime_last_played is a Unix timestamp; 0 means Steam has no
                // record of a session, so leave lastPlayed unset in that case.
                ...(g.rtime_last_played ? { lastPlayed: new Date(g.rtime_last_played * 1000) } : {}),
                syncedAt: new Date(),
              },
              { upsert: true, new: true, setDefaultsOnInsert: true },
            )
            .exec(),
        ),
      );

      // One totals snapshot per owned-and-played game per sync run; never-played
      // games are skipped since their delta is always 0 and would only add
      // storage noise. This is the raw material the "Son Haftalar" trend on
      // the profile page is built from — Steam's API has no historical
      // playtime endpoint, so this snapshot stream is the only way to derive
      // a real week-over-week chart over time.
      const capturedAt = new Date();
      const playedGames = ownedGames.filter((g) => g.playtime_forever > 0);
      if (playedGames.length > 0) {
        await this.playtimeSnapshotModel.insertMany(
          playedGames.map((g) => ({
            userId: new Types.ObjectId(userId),
            appid: g.appid,
            playtimeForeverMinutes: g.playtime_forever,
            capturedAt,
          })),
        );
      }

      const steamLevel = await this.steamApi.getSteamLevel(steamId);
      if (steamLevel !== null) {
        await this.usersService.setSteamLevel(userId, steamLevel);
      }

      const appids = ownedGames.map((g) => g.appid);

      const missingCatalog = await this.catalogService.findMissingOrStaleAppids(appids, CATALOG_STALE_AFTER_MS);
      for (const appid of missingCatalog) {
        await this.storeSyncService.enqueueAppDetailsFetch(appid);
      }

      const staleReviews = await this.reviewsService.findStaleOrMissing(appids, REVIEW_STALE_AFTER_MS);
      for (const appid of staleReviews) {
        await this.storeSyncService.enqueueReviewsFetch(appid);
      }

      // Achievements are the most expensive per-user sync (one request per
      // owned game); this only enqueues low-priority background jobs and
      // never blocks the rest of library sync.
      await this.achievementsSyncService.enqueueForLibrary(userId, steamId, appids);
      await this.steamSpySyncService.enqueueForLibrary(appids);

      // "Oyun DNA'sı" is rebuilt from whatever catalog/review/achievement
      // data is already cached; background jobs enqueued above will refine
      // it further on their own schedule.
      await this.profileService.buildUserProfile(userId);

      this.logger.log(
        `Kütüphane senkronize edildi: userId=${userId} oyun=${ownedGames.length} eksikKatalog=${missingCatalog.length} eksikReview=${staleReviews.length}`,
      );
      await this.syncJobs.complete(job._id.toString());
    } catch (err) {
      await this.syncJobs.fail(job._id.toString(), (err as Error).message);
      throw err;
    }
  }
}
