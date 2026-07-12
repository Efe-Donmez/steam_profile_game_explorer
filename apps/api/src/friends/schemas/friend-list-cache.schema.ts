import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class CachedFriend {
  @Prop({ required: true })
  steamId: string;

  @Prop({ required: true })
  personaName: string;

  @Prop({ required: true })
  avatarUrl: string;

  @Prop({ required: true })
  personaState: number;

  @Prop()
  currentGameName?: string;

  @Prop()
  currentGameAppid?: number;

  @Prop({ required: true })
  friendSince: Date;
}

export const CachedFriendSchema = SchemaFactory.createForClass(CachedFriend);

export type FriendListCacheDocument = HydratedDocument<FriendListCache>;

@Schema()
export class FriendListCache {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: [CachedFriendSchema], default: [] })
  friends: CachedFriend[];

  @Prop({ required: true, default: () => new Date() })
  fetchedAt: Date;
}

export const FriendListCacheSchema = SchemaFactory.createForClass(FriendListCache);
