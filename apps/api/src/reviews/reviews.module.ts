import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameReview, GameReviewSchema } from './schemas/game-review.schema';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: GameReview.name, schema: GameReviewSchema }])],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
