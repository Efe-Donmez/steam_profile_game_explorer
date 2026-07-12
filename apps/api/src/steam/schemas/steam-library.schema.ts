import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SteamLibraryDocument = HydratedDocument<SteamLibrary>;

@Schema()
export class SteamLibrary {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  appid: number;

  @Prop({ required: true, default: 0 })
  playtimeForeverMinutes: number;

  @Prop({ default: 0 })
  playtime2WeeksMinutes: number;

  @Prop()
  lastPlayed?: Date;

  @Prop({ required: true, default: () => new Date() })
  syncedAt: Date;
}

export const SteamLibrarySchema = SchemaFactory.createForClass(SteamLibrary);
SteamLibrarySchema.index({ userId: 1, appid: 1 }, { unique: true });
