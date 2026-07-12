import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class GuestLibraryEntry {
  @Prop({ required: true })
  appid: number;

  @Prop({ required: true, default: 0 })
  playtimeForeverMinutes: number;

  @Prop({ default: 0 })
  playtime2WeeksMinutes: number;

  @Prop()
  lastPlayed?: Date;
}

export const GuestLibraryEntrySchema = SchemaFactory.createForClass(GuestLibraryEntry);

export type GuestLibraryCacheDocument = HydratedDocument<GuestLibraryCache>;

/**
 * Owned-games snapshot for a Steam friend who has never logged into
 * SteamCompass — keyed by `steamId` (not by viewer) since it's just a cache
 * of that public Steam profile's own data, shared across every viewer who
 * looks at the same friend.
 */
@Schema()
export class GuestLibraryCache {
  @Prop({ required: true, unique: true, index: true })
  steamId: string;

  @Prop({ type: [GuestLibraryEntrySchema], default: [] })
  library: GuestLibraryEntry[];

  @Prop({ required: true, default: () => new Date() })
  fetchedAt: Date;
}

export const GuestLibraryCacheSchema = SchemaFactory.createForClass(GuestLibraryCache);
