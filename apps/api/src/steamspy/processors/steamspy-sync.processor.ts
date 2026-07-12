import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SteamSpyApiService } from '../../steamspy-api/steamspy-api.service';
import { SteamSpyService } from '../steamspy.service';

export interface SteamSpyJobData {
  appid: number;
}

@Injectable()
@Processor('steamspy-sync', { concurrency: 1, limiter: { max: 1, duration: 1000 } })
export class SteamSpySyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SteamSpySyncProcessor.name);

  constructor(
    private readonly steamSpyApi: SteamSpyApiService,
    private readonly steamSpyService: SteamSpyService,
  ) {
    super();
  }

  async process(job: Job<SteamSpyJobData>): Promise<void> {
    const { appid } = job.data;
    const details = await this.steamSpyApi.getAppDetails(appid);
    if (!details) {
      this.logger.warn(`SteamSpy verisi bulunamadı, appid=${appid} atlanıyor`);
      return;
    }
    await this.steamSpyService.upsertFromDetails(appid, details);
  }
}
