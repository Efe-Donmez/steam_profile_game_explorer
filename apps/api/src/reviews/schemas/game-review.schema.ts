import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GameReviewDocument = HydratedDocument<GameReview>;

@Schema()
export class GameReview {
  @Prop({ required: true, unique: true, index: true })
  appid: number;

  @Prop({ required: true, default: 0 })
  totalPositive: number;

  @Prop({ required: true, default: 0 })
  totalNegative: number;

  @Prop({ default: 0 })
  totalReviews: number;

  // Steam's own 0-9 review score bucket (9 = Overwhelmingly Positive)
  @Prop()
  reviewScore?: number;

  @Prop()
  reviewScoreDesc?: string;

  @Prop({ required: true, default: () => new Date() })
  lastFetchedAt: Date;
}

export const GameReviewSchema = SchemaFactory.createForClass(GameReview);
