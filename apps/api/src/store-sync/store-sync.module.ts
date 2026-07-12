import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { StoreSyncService } from './store-sync.service';
import { StoreSyncProcessor } from './processors/store-sync.processor';
import { SteamApiModule } from '../steam-api/steam-api.module';
import { CatalogModule } from '../catalog/catalog.module';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [SteamApiModule, CatalogModule, ReviewsModule, BullModule.registerQueue({ name: 'store-api-sync' })],
  providers: [StoreSyncService, StoreSyncProcessor],
  exports: [StoreSyncService],
})
export class StoreSyncModule {}
