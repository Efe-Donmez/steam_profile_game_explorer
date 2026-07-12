import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiRefinementTurn, AiRefinementTurnSchema } from './schemas/ai-refinement-turn.schema';
import { AiClientService } from './ai-client.service';
import { AiRecommendationsService } from './ai-recommendations.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: AiRefinementTurn.name, schema: AiRefinementTurnSchema }])],
  providers: [AiClientService, AiRecommendationsService],
  exports: [AiRecommendationsService],
})
export class AiRecommendationsModule {}
