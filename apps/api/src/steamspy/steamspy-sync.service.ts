import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SteamSpyService } from './steamspy.service';
import { SteamSpyJobData } from './processors/steamspy-sync.processor';

@Injectable()
export class SteamSpySyncService {
  constructor(
    private readonly steamSpyService: SteamSpyService,
    @InjectQueue('steamspy-sync') private readonly queue: Queue<SteamSpyJobData>,
  ) {}

  async enqueueForLibrary(appids: number[]): Promise<void> {
    const stale = await this.steamSpyService.findStaleOrMissing(appids);
    for (const appid of stale) {
      // See store-sync.service.ts for why a fixed jobId would block every
      // re-fetch after the first one — SteamSpyService.findStaleOrMissing
      // already re-flags 14-day-old entries, but a static id here would
      // still swallow the re-add.
      await this.queue.add('fetch-steamspy', { appid }, { jobId: `steamspy-${appid}-${Date.now()}`, priority: 20 });
    }
  }
}
