import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RecommendationResultDocument = HydratedDocument<RecommendationResult>;

@Schema()
export class RecommendationResult {
  @Prop({ type: Types.ObjectId, ref: 'RecommendationRequest', required: true, index: true })
  requestId: Types.ObjectId;

  @Prop({ required: true, index: true })
  appid: number;

  @Prop({ required: true })
  score: number;

  @Prop()
  reasoning?: string;

  @Prop({ type: [String], default: [] })
  reasoningFactors: string[];

  @Prop({ required: true })
  rank: number;
}

export const RecommendationResultSchema = SchemaFactory.createForClass(RecommendationResult);
