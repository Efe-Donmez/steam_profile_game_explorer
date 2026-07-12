import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SteamSpyCacheDocument = HydratedDocument<SteamSpyCache>;

@Schema()
export class SteamSpyCache {
  @Prop({ required: true, unique: true, index: true })
  appid: number;

  @Prop({ required: true })
  ownersRangeLabel: string;

  @Prop({ required: true, default: 0 })
  avgPlaytimeForever: number;

  @Prop({ required: true, default: 0 })
  avgPlaytime2Weeks: number;

  // Top community tags by vote count (descending). Community-sourced,
  // always presented to the user as estimated data.
  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: 0 })
  positive: number;

  @Prop({ default: 0 })
  negative: number;

  // Peak concurrent users yesterday, per SteamSpy.
  @Prop({ default: 0 })
  ccu: number;

  @Prop({ required: true, default: () => new Date() })
  fetchedAt: Date;
}

export const SteamSpyCacheSchema = SchemaFactory.createForClass(SteamSpyCache);
