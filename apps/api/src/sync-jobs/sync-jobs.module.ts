import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SyncJob, SyncJobSchema } from './schemas/sync-job.schema';
import { SyncJobsService } from './sync-jobs.service';
import { SyncJobsController } from './sync-jobs.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: SyncJob.name, schema: SyncJobSchema }])],
  controllers: [SyncJobsController],
  providers: [SyncJobsService],
  exports: [SyncJobsService],
})
export class SyncJobsModule {}
