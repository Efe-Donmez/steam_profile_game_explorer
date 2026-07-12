import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { RecommendationFiltersDto } from './recommendation-filters.dto';

export type RecommendationMode = 'algorithmic' | 'ai_assisted';
export type RecommendationSort =
  | 'relevance'
  | 'score'
  | 'price_asc'
  | 'price_desc'
  | 'release_date'
  | 'discount';

export class CreateRecommendationRequestDto {
  @ValidateNested()
  @Type(() => RecommendationFiltersDto)
  filters: RecommendationFiltersDto = new RecommendationFiltersDto();

  @IsOptional()
  @IsIn(['algorithmic', 'ai_assisted'])
  mode: RecommendationMode = 'algorithmic';

  @IsOptional()
  @IsIn(['relevance', 'score', 'price_asc', 'price_desc', 'release_date', 'discount'])
  sort: RecommendationSort = 'relevance';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 12;
}
