import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SteamApiService } from '../../steam-api/steam-api.service';
import { CatalogService } from '../../catalog/catalog.service';
import { ReviewsService } from '../../reviews/reviews.service';

export interface StoreSyncJobData {
  appid: number;
}

// Steam's Store API (appdetails + appreviews) allows roughly 200 requests / 5
// minutes combined. Both job kinds share this single worker/limiter so the
// budget is respected across both endpoint families, not per-endpoint.
@Injectable()
@Processor('store-api-sync', { concurrency: 1, limiter: { max: 1, duration: 1700 } })
export class StoreSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(StoreSyncProcessor.name);

  constructor(
    private readonly steamApi: SteamApiService,
    private readonly catalogService: CatalogService,
    private readonly reviewsService: ReviewsService,
  ) {
    super();
  }

  async process(job: Job<StoreSyncJobData>): Promise<void> {
    const { appid } = job.data;

    if (job.name === 'fetch-appdetails') {
      const details = await this.steamApi.getAppDetails(appid);
      if (!details) {
        this.logger.warn(`appdetails bulunamadı, appid=${appid} atlanıyor`);
        return;
      }
      await this.catalogService.upsertFromDetails(appid, details);
      return;
    }

    if (job.name === 'fetch-reviews') {
      const summary = await this.steamApi.getAppReviews(appid);
      if (!summary) {
        this.logger.warn(`appreviews bulunamadı, appid=${appid} atlanıyor`);
        return;
      }
      await this.reviewsService.upsertFromSummary(appid, summary);
      return;
    }

    this.logger.warn(`Bilinmeyen job tipi: ${job.name}`);
  }
}
