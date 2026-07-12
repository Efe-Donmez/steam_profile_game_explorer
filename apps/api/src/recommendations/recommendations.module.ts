import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Game, GameSchema } from '../catalog/schemas/game.schema';
import { GameReview, GameReviewSchema } from '../reviews/schemas/game-review.schema';
import { SteamLibrary, SteamLibrarySchema } from '../steam/schemas/steam-library.schema';
import { UserProfile, UserProfileSchema } from '../profile/schemas/user-profile.schema';
import { RecommendationRequest, RecommendationRequestSchema } from './schemas/recommendation-request.schema';
import { RecommendationResult, RecommendationResultSchema } from './schemas/recommendation-result.schema';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';
import { AiRecommendationsModule } from '../ai-recommendations/ai-recommendations.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Game.name, schema: GameSchema },
      { name: GameReview.name, schema: GameReviewSchema },
      { name: SteamLibrary.name, schema: SteamLibrarySchema },
      { name: UserProfile.name, schema: UserProfileSchema },
      { name: RecommendationRequest.name, schema: RecommendationRequestSchema },
      { name: RecommendationResult.name, schema: RecommendationResultSchema },
    ]),
    AiRecommendationsModule,
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
