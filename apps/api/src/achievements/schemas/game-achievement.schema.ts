import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class PlayerAchievementEntry {
  @Prop({ required: true })
  apiName: string;

  @Prop()
  displayName?: string;

  @Prop({ required: true, default: false })
  achieved: boolean;

  @Prop()
  unlockTime?: Date;
}

export const PlayerAchievementEntrySchema = SchemaFactory.createForClass(PlayerAchievementEntry);

export type GameAchievementDocument = HydratedDocument<GameAchievement>;

@Schema()
export class GameAchievement {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  appid: number;

  @Prop({ type: [PlayerAchievementEntrySchema], default: [] })
  achievements: PlayerAchievementEntry[];

  @Prop({ required: true, default: 0 })
  completionPercent: number;

  @Prop({ required: true, default: () => new Date() })
  syncedAt: Date;
}

export const GameAchievementSchema = SchemaFactory.createForClass(GameAchievement);
GameAchievementSchema.index({ userId: 1, appid: 1 }, { unique: true });
