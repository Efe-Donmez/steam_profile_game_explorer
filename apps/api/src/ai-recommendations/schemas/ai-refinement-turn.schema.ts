import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AiRefinementTurnDocument = HydratedDocument<AiRefinementTurn>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class AiRefinementTurn {
  @Prop({ type: Types.ObjectId, ref: 'RecommendationRequest', required: true, index: true })
  requestId: Types.ObjectId;

  @Prop({ required: true })
  userMessage: string;

  @Prop({ type: Object, required: true })
  appliedFilterDelta: Record<string, unknown>;

  createdAt?: Date;
}

export const AiRefinementTurnSchema = SchemaFactory.createForClass(AiRefinementTurn);
