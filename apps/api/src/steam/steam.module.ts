import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { SteamLibrary, SteamLibrarySchema } from './schemas/steam-library.schema';
import { PlaytimeSnapshot, PlaytimeSnapshotSchema } from './schemas/playtime-snapshot.schema';
import { LibrarySyncService } from './library-sync.service';
import { LibrarySyncProcessor } from './processors/library-sync.processor';
import { LibrarySyncSchedulerService } from './library-sync-scheduler.service';
import { SteamApiModule } from '../steam-api/steam-api.module';
import { CatalogModule } from '../catalog/catalog.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { StoreSyncModule } from '../store-sync/store-sync.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { SteamSpyModule } from '../steamspy/steamspy.module';
import { SyncJobsModule } from '../sync-jobs/sync-jobs.module';
import { UsersModule } from '../users/users.module';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [
    SteamApiModule,
    CatalogModule,
    ReviewsModule,
    StoreSyncModule,
    AchievementsModule,
    SteamSpyModule,
    SyncJobsModule,
    UsersModule,
    ProfileModule,
    MongooseModule.forFeature([
      { name: SteamLibrary.name, schema: SteamLibrarySchema },
      { name: PlaytimeSnapshot.name, schema: PlaytimeSnapshotSchema },
    ]),
    BullModule.registerQueue({ name: 'library-sync' }),
  ],
  providers: [LibrarySyncService, LibrarySyncProcessor, LibrarySyncSchedulerService],
  exports: [LibrarySyncService],
})
export class SteamModule {}
