import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PlaytimeSnapshotDocument = HydratedDocument<PlaytimeSnapshot>;

/**
 * Daily playtime snapshot per user/game, written on every library sync.
 * Steam's API only exposes `playtime_forever` (lifetime total) and
 * `playtime_2weeks` (rolling window) — neither gives a real week-by-week
 * history. This collection accumulates one totals snapshot per sync run so
 * a genuine weekly trend can be derived from consecutive deltas over time.
 */
@Schema()
export class PlaytimeSnapshot {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  appid: number;

  @Prop({ required: true, default: 0 })
  playtimeForeverMinutes: number;

  @Prop({ required: true, default: () => new Date(), index: true })
  capturedAt: Date;
}

export const PlaytimeSnapshotSchema = SchemaFactory.createForClass(PlaytimeSnapshot);
PlaytimeSnapshotSchema.index({ userId: 1, capturedAt: 1 });
