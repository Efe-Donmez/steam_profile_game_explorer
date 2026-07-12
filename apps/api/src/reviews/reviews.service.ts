import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GameReview, GameReviewDocument } from './schemas/game-review.schema';
import { SteamAppReviewSummary } from '../steam-api/steam-api.service';

@Injectable()
export class ReviewsService {
  constructor(@InjectModel(GameReview.name) private readonly reviewModel: Model<GameReviewDocument>) {}

  async findStaleOrMissing(appids: number[], maxAgeMs: number): Promise<number[]> {
    const cutoff = new Date(Date.now() - maxAgeMs);
    // `totalReviews: $exists` re-flags pre-migration documents written before
    // total_reviews/review_score capture; post-migration upserts always set it.
    const fresh = await this.reviewModel
      .find(
        { appid: { $in: appids }, lastFetchedAt: { $gte: cutoff }, totalReviews: { $exists: true } },
        { appid: 1 },
      )
      .lean()
      .exec();
    const freshSet = new Set(fresh.map((r) => r.appid));
    return appids.filter((id) => !freshSet.has(id));
  }

  async upsertFromSummary(appid: number, summary: SteamAppReviewSummary): Promise<void> {
    await this.reviewModel
      .findOneAndUpdate(
        { appid },
        {
          appid,
          totalPositive: summary.total_positive,
          totalNegative: summary.total_negative,
          totalReviews: summary.total_reviews ?? summary.total_positive + summary.total_negative,
          reviewScore: summary.review_score,
          reviewScoreDesc: summary.review_score_desc,
          lastFetchedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  findForAppids(appids: number[]): Promise<GameReviewDocument[]> {
    return this.reviewModel.find({ appid: { $in: appids } }).exec();
  }
}
