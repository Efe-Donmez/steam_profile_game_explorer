import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class GamePlatforms {
  @Prop({ default: false })
  windows: boolean;

  @Prop({ default: false })
  mac: boolean;

  @Prop({ default: false })
  linux: boolean;
}

export const GamePlatformsSchema = SchemaFactory.createForClass(GamePlatforms);

export type GameDocument = HydratedDocument<Game>;

@Schema()
export class Game {
  @Prop({ required: true, unique: true, index: true })
  appid: number;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [String], default: [] })
  genres: string[];

  @Prop({ type: [String], default: [] })
  categories: string[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  priceCents?: number;

  // Undiscounted list price (price_overview.initial). Spend estimates use
  // this; `priceCents` is the current (possibly discounted) price.
  @Prop()
  basePriceCents?: number;

  @Prop()
  currency?: string;

  @Prop({ default: 0 })
  discountPercent: number;

  @Prop({ default: false })
  isFree: boolean;

  @Prop()
  metacriticScore?: number;

  @Prop()
  releaseDate?: string;

  @Prop({ index: true })
  releaseYear?: number;

  @Prop()
  headerImage?: string;

  @Prop()
  capsuleImage?: string;

  @Prop()
  backgroundImage?: string;

  @Prop()
  movieThumbnail?: string;

  @Prop()
  shortDescription?: string;

  @Prop({ type: [String], default: [] })
  screenshots: string[];

  // Total Steam user recommendations ("X kişi öneriyor")
  @Prop()
  recommendationsTotal?: number;

  @Prop()
  achievementsTotal?: number;

  // "full" | "partial" | undefined
  @Prop()
  controllerSupport?: string;

  @Prop()
  supportedLanguages?: string;

  @Prop({ default: 0 })
  dlcCount: number;

  @Prop({ type: [String], default: [] })
  developers: string[];

  @Prop({ type: [String], default: [] })
  publishers: string[];

  @Prop({ type: GamePlatformsSchema, default: {} })
  platforms: GamePlatforms;

  @Prop()
  lastFetchedAt?: Date;
}

export const GameSchema = SchemaFactory.createForClass(Game);
