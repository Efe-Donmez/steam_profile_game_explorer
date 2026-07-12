import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SavedFilterPresetDocument = HydratedDocument<SavedFilterPreset>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class SavedFilterPreset {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  label: string;

  @Prop({ type: Object, required: true })
  filters: Record<string, unknown>;

  createdAt?: Date;
}

export const SavedFilterPresetSchema = SchemaFactory.createForClass(SavedFilterPreset);
