import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { StoreSyncJobData } from './processors/store-sync.processor';

@Injectable()
export class StoreSyncService {
  constructor(@InjectQueue('store-api-sync') private readonly queue: Queue<StoreSyncJobData>) {}

  async enqueueAppDetailsFetch(appid: number): Promise<void> {
    // BullMQ treats `add()` as a no-op whenever a job with the same jobId
    // already exists (completed or not), so a fixed `appdetails-${appid}` id
    // would only ever let the very first fetch for a game run — every later
    // staleness-triggered re-fetch (and every retry after a failure) would
    // silently be swallowed. The timestamp suffix keeps enqueues idempotent
    // only within the same tick, not forever.
    await this.queue.add('fetch-appdetails', { appid }, { jobId: `appdetails-${appid}-${Date.now()}` });
  }

  async enqueueReviewsFetch(appid: number): Promise<void> {
    await this.queue.add('fetch-reviews', { appid }, { jobId: `reviews-${appid}-${Date.now()}` });
  }
}
