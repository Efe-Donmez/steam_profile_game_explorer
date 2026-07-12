import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false } })
export class User {
  @Prop({ required: true, unique: true, index: true })
  steamId: string;

  @Prop({ required: true })
  personaName: string;

  @Prop({ required: true })
  avatarUrl: string;

  @Prop({ required: true })
  profileVisibility: number;

  @Prop()
  steamLevel?: number;

  @Prop()
  jwtRefreshTokenHash?: string;

  @Prop()
  lastSyncedAt?: Date;

  createdAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
