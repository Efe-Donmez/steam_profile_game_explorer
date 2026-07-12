import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LibrarySyncService, LibrarySyncJobData } from '../library-sync.service';

@Injectable()
@Processor('library-sync', { concurrency: 2 })
export class LibrarySyncProcessor extends WorkerHost {
  constructor(private readonly librarySyncService: LibrarySyncService) {
    super();
  }

  async process(job: Job<LibrarySyncJobData>): Promise<void> {
    await this.librarySyncService.syncLibrary(job.data.userId, job.data.steamId);
  }
}
