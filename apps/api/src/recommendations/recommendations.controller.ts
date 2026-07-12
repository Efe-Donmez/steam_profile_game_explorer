import { Body, Controller, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { RecommendationsService } from './recommendations.service';
import { CreateRecommendationRequestDto } from './dto/create-recommendation-request.dto';
import { GetFacetsRequestDto } from './dto/get-facets-request.dto';
import { RefineRequestDto } from './dto/refine-request.dto';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Post()
  create(@Req() req: Request, @Body() body: CreateRecommendationRequestDto) {
    const { sub } = req.user as JwtPayload;
    return this.recommendationsService.recommend(sub, body.filters, body.mode, body.sort, body.page, body.limit);
  }

  // POST, not GET: a query string collapses a single-selected genre/tag/
  // platform/playstyle down to a bare string, which fails this DTO's
  // @IsArray() checks the moment exactly one is picked (see
  // GetFacetsRequestDto's doc comment).
  @Post('facets')
  getFacets(@Req() req: Request, @Body() body: GetFacetsRequestDto) {
    const { sub } = req.user as JwtPayload;
    return this.recommendationsService.getFacets(sub, body.filters);
  }

  @Post(':id/refine')
  async refine(@Req() req: Request, @Param('id') id: string, @Body() body: RefineRequestDto) {
    const { sub } = req.user as JwtPayload;
    const original = await this.recommendationsService.findRequestById(id, sub);
    if (!original) {
      throw new NotFoundException('Öneri isteği bulunamadı');
    }

    const { filters, description } = await this.recommendationsService.refineFilters(id, sub, body.message);
    const results = await this.recommendationsService.recommend(sub, filters, 'ai_assisted', 'relevance', 1, 12);

    return { filterNote: description, ...results };
  }
}
