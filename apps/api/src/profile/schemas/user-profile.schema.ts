import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class FeatureCoverage {
  @Prop({ required: true, default: 0 })
  multiplayer: number;

  @Prop({ required: true, default: 0 })
  coop: number;

  @Prop({ required: true, default: 0 })
  controller: number;

  @Prop({ required: true, default: 0 })
  cloudSave: number;

  @Prop({ required: true, default: 0 })
  achievements: number;

  @Prop({ required: true, default: 0 })
  singleplayer: number;
}

export const FeatureCoverageSchema = SchemaFactory.createForClass(FeatureCoverage);

@Schema({ _id: false })
export class ReviewSentimentBuckets {
  @Prop({ required: true, default: 0 })
  excellent: number;

  @Prop({ required: true, default: 0 })
  positive: number;

  @Prop({ required: true, default: 0 })
  mixed: number;

  @Prop({ required: true, default: 0 })
  negative: number;
}

export const ReviewSentimentBucketsSchema = SchemaFactory.createForClass(ReviewSentimentBuckets);

@Schema({ _id: false })
export class RarestAchievement {
  @Prop({ required: true })
  appid: number;

  @Prop({ required: true })
  gameName: string;

  @Prop()
  headerImage?: string;

  @Prop()
  capsuleImage?: string;

  @Prop({ required: true })
  apiName: string;

  @Prop()
  displayName?: string;

  @Prop()
  unlockTime?: Date;

  @Prop({ required: true })
  globalUnlockPercent: number;
}

export const RarestAchievementSchema = SchemaFactory.createForClass(RarestAchievement);

@Schema({ _id: false })
export class CoverageCounts {
  @Prop({ required: true, default: 0 })
  fetched: number;

  @Prop({ required: true, default: 0 })
  total: number;
}

export const CoverageCountsSchema = SchemaFactory.createForClass(CoverageCounts);

@Schema({ _id: false })
export class DataCoverage {
  @Prop({ type: CoverageCountsSchema, default: {} })
  catalog: CoverageCounts;

  @Prop({ type: CoverageCountsSchema, default: {} })
  reviews: CoverageCounts;

  @Prop({ type: CoverageCountsSchema, default: {} })
  achievements: CoverageCounts;

  @Prop({ type: CoverageCountsSchema, default: {} })
  steamSpy: CoverageCounts;
}

export const DataCoverageSchema = SchemaFactory.createForClass(DataCoverage);

@Schema({ _id: false })
export class ValueLeagueEntry {
  @Prop({ required: true })
  appid: number;

  @Prop({ required: true })
  name: string;

  @Prop()
  headerImage?: string;

  @Prop()
  capsuleImage?: string;

  @Prop({ required: true, default: 0 })
  basePriceCents: number;

  @Prop({ required: true, default: 0 })
  hours: number;

  @Prop({ required: true, default: 0 })
  centsPerHour: number;
}

export const ValueLeagueEntrySchema = SchemaFactory.createForClass(ValueLeagueEntry);

@Schema({ _id: false })
export class RecentTempoGame {
  @Prop({ required: true })
  appid: number;

  @Prop({ required: true })
  name: string;

  @Prop()
  headerImage?: string;

  @Prop()
  capsuleImage?: string;

  @Prop({ required: true, default: 0 })
  minutes2Weeks: number;
}

export const RecentTempoGameSchema = SchemaFactory.createForClass(RecentTempoGame);

@Schema({ _id: false })
export class RecentTempo {
  @Prop({ required: true, default: 0 })
  games2Weeks: number;

  @Prop({ required: true, default: 0 })
  minutes2Weeks: number;

  @Prop({ type: [RecentTempoGameSchema], default: [] })
  topRecent: RecentTempoGame[];
}

export const RecentTempoSchema = SchemaFactory.createForClass(RecentTempo);

@Schema({ _id: false })
export class PlatformCoverage {
  @Prop({ required: true, default: 0 })
  windows: number;

  @Prop({ required: true, default: 0 })
  mac: number;

  @Prop({ required: true, default: 0 })
  linux: number;
}

export const PlatformCoverageSchema = SchemaFactory.createForClass(PlatformCoverage);

@Schema({ _id: false })
export class PlaytimeBuckets {
  @Prop({ required: true, default: 0 })
  never: number;

  @Prop({ required: true, default: 0 })
  under1h: number;

  @Prop({ required: true, default: 0 })
  h1to5: number;

  @Prop({ required: true, default: 0 })
  h5to20: number;

  @Prop({ required: true, default: 0 })
  h20to100: number;

  @Prop({ required: true, default: 0 })
  over100h: number;
}

export const PlaytimeBucketsSchema = SchemaFactory.createForClass(PlaytimeBuckets);

@Schema({ _id: false })
export class RecencyBuckets {
  @Prop({ required: true, default: 0 })
  last2Weeks: number;

  @Prop({ required: true, default: 0 })
  lastMonth: number;

  @Prop({ required: true, default: 0 })
  last6Months: number;

  @Prop({ required: true, default: 0 })
  lastYear: number;

  @Prop({ required: true, default: 0 })
  older: number;

  @Prop({ required: true, default: 0 })
  unknown: number;
}

export const RecencyBucketsSchema = SchemaFactory.createForClass(RecencyBuckets);

export type UserProfileDocument = HydratedDocument<UserProfile>;

@Schema({ timestamps: { createdAt: false, updatedAt: 'updatedAt' } })
export class UserProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  genreWeights: Record<string, number>;

  @Prop({ type: Object, default: {} })
  tagWeights: Record<string, number>;

  @Prop({ required: true, default: 0 })
  totalGames: number;

  @Prop({ required: true, default: 0 })
  totalPlaytimeMinutes: number;

  @Prop({ required: true, default: 0 })
  totalEstimatedSpendCents: number;

  // Dominant ISO currency code across the user's priced games (e.g. "USD" —
  // Steam's Turkey region switched from TRY to USD in 2024). All *Cents
  // fields on this document are in this currency.
  @Prop()
  currency?: string;

  // Sum of current (possibly discounted) list prices — "what the library
  // costs today". Difference vs totalEstimatedSpendCents shows discount gain.
  @Prop({ required: true, default: 0 })
  libraryValueCents: number;

  @Prop({ required: true, default: 0 })
  avgPricePaid: number;

  @Prop({ required: true, default: 0 })
  avgMetacriticPreference: number;

  @Prop({ required: true, default: 0 })
  avgReviewScorePreference: number;

  @Prop({ type: FeatureCoverageSchema, default: {} })
  featureCoverage: FeatureCoverage;

  @Prop({ required: true, default: 0 })
  nicheScore: number;

  @Prop({ required: true, default: 0 })
  avgAchievementCompletion: number;

  @Prop({ type: [RarestAchievementSchema], default: [] })
  rarestAchievements: RarestAchievement[];

  @Prop({ type: Object, default: {} })
  releaseYearHistogram: Record<string, number>;

  @Prop({ type: Object, default: {} })
  metacriticHistogram: Record<string, number>;

  @Prop({ type: ReviewSentimentBucketsSchema, default: {} })
  reviewSentimentBuckets: ReviewSentimentBuckets;

  // --- Derived extras ("Utanç Yığını", value league, tempo, platforms) ---

  @Prop({ required: true, default: 0 })
  neverPlayedCount: number;

  @Prop({ required: true, default: 0 })
  neverPlayedValueCents: number;

  @Prop({ required: true, default: 0 })
  freeGameCount: number;

  @Prop({ required: true, default: 0 })
  paidGameCount: number;

  @Prop({ type: [ValueLeagueEntrySchema], default: [] })
  bestValueGames: ValueLeagueEntry[];

  @Prop({ type: [ValueLeagueEntrySchema], default: [] })
  worstValueGames: ValueLeagueEntry[];

  @Prop({ type: RecentTempoSchema, default: {} })
  recentTempo: RecentTempo;

  @Prop({ type: PlatformCoverageSchema, default: {} })
  platformCoverage: PlatformCoverage;

  @Prop()
  oldestGameYear?: number;

  @Prop()
  newestGameYear?: number;

  @Prop()
  medianReleaseYear?: number;

  @Prop({ type: DataCoverageSchema, default: {} })
  coverage: DataCoverage;

  // --- Competitor-inspired stats (SteamDB calculator / completionist.me) ---

  @Prop({ type: PlaytimeBucketsSchema, default: {} })
  playtimeBuckets: PlaytimeBuckets;

  @Prop({ type: RecencyBucketsSchema, default: {} })
  recencyBuckets: RecencyBuckets;

  // Games with 100% achievement completion
  @Prop({ required: true, default: 0 })
  perfectGamesCount: number;

  @Prop({ required: true, default: 0 })
  totalAchievementsUnlocked: number;

  // totalEstimatedSpendCents / total played hours, rounded
  @Prop({ required: true, default: 0 })
  overallCostPerHourCents: number;

  updatedAt?: Date;
}

export const UserProfileSchema = SchemaFactory.createForClass(UserProfile);
