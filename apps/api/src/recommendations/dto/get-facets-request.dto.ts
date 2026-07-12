import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { RecommendationFiltersDto } from './recommendation-filters.dto';

/**
 * Body wrapper for POST /recommendations/facets (and the friend/guest
 * equivalents). Facets used to be a GET with the filter object flattened
 * into query params — but a query string collapses a single-element array
 * (e.g. `?genres=Action`) down to a bare string, which fails the DTO's
 * `@IsArray()` checks on genres/tags/platforms/playstyle as soon as exactly
 * one is selected (400 Bad Request). A JSON body has no such ambiguity.
 */
export class GetFacetsRequestDto {
  @ValidateNested()
  @Type(() => RecommendationFiltersDto)
  filters: RecommendationFiltersDto = new RecommendationFiltersDto();
}
