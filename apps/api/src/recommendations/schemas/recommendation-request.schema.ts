import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RecommendationRequestDocument = HydratedDocument<RecommendationRequest>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class RecommendationRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Object, required: true })
  filters: Record<string, unknown>;

  @Prop({ required: true, enum: ['algorithmic', 'ai_assisted'] })
  mode: string;

  // Set only for friend-view requests: whose DNA/library the ranking was
  // built from, when that differs from `userId` (the viewer who triggered
  // and owns this request/result history).
  @Prop({ type: Types.ObjectId, ref: 'User' })
  subjectUserId?: Types.ObjectId;

  // Set only for guest-view requests (a Steam friend who never logged into
  // SteamCompass, so has no `subjectUserId` to point to).
  @Prop()
  subjectSteamId?: string;

  createdAt?: Date;
}

export const RecommendationRequestSchema = SchemaFactory.createForClass(RecommendationRequest);
