import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SyncJob, SyncJobDocument, SyncJobType } from './schemas/sync-job.schema';

@Injectable()
export class SyncJobsService {
  constructor(@InjectModel(SyncJob.name) private readonly syncJobModel: Model<SyncJobDocument>) {}

  async start(userId: string, type: SyncJobType): Promise<SyncJobDocument> {
    return this.syncJobModel.create({
      userId: new Types.ObjectId(userId),
      type,
      status: 'running',
      startedAt: new Date(),
    });
  }

  async complete(jobId: string): Promise<void> {
    await this.syncJobModel
      .findByIdAndUpdate(jobId, { status: 'completed', finishedAt: new Date() })
      .exec();
  }

  async fail(jobId: string, error: string): Promise<void> {
    await this.syncJobModel
      .findByIdAndUpdate(jobId, { status: 'failed', finishedAt: new Date(), error })
      .exec();
  }

  findLatest(userId: string, type: SyncJobType): Promise<SyncJobDocument | null> {
    return this.syncJobModel
      .findOne({ userId: new Types.ObjectId(userId), type })
      .sort({ startedAt: -1 })
      .exec();
  }
}
