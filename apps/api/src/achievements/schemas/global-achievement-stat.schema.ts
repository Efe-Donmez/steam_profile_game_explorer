import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class GlobalAchievementEntry {
  @Prop({ required: true })
  apiName: string;

  @Prop({ required: true })
  globalUnlockPercent: number;
}

export const GlobalAchievementEntrySchema = SchemaFactory.createForClass(GlobalAchievementEntry);

export type GlobalAchievementStatDocument = HydratedDocument<GlobalAchievementStat>;

@Schema()
export class GlobalAchievementStat {
  @Prop({ required: true, unique: true, index: true })
  appid: number;

  @Prop({ type: [GlobalAchievementEntrySchema], default: [] })
  achievements: GlobalAchievementEntry[];

  @Prop({ required: true, default: () => new Date() })
  lastFetchedAt: Date;
}

export const GlobalAchievementStatSchema = SchemaFactory.createForClass(GlobalAchievementStat);
