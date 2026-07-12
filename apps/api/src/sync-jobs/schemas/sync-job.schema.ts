import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SyncJobType = 'library' | 'catalog' | 'reviews' | 'achievements' | 'steamspy';
export type SyncJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export type SyncJobDocument = HydratedDocument<SyncJob>;

@Schema()
export class SyncJob {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['library', 'catalog', 'reviews', 'achievements', 'steamspy'] })
  type: SyncJobType;

  @Prop({ required: true, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' })
  status: SyncJobStatus;

  @Prop()
  startedAt?: Date;

  @Prop()
  finishedAt?: Date;

  @Prop()
  error?: string;
}

export const SyncJobSchema = SchemaFactory.createForClass(SyncJob);
