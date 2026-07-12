import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export type ReviewSentiment = 'any' | 'positive' | 'very_positive' | 'overwhelming';
export type Playstyle = 'singleplayer' | 'multiplayer' | 'coop' | 'controller' | 'achievements' | 'cloudSave';
export type Platform = 'windows' | 'mac' | 'linux';

// `@Type(() => Boolean)` coerces via the native `Boolean()` constructor, under
// which any non-empty string (including the literal "false") is truthy. Query
// params always arrive as strings, so that coercion silently flips an
// explicit `?onlyDiscounted=false` to `true`. This transform parses the
// string content instead.
function ToBoolean() {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return value;
  });
}

export class RecommendationFiltersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMin: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMax: number = 50000;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  onlyDiscounted: boolean = false;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  includeFree: boolean = true;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genres: string[] = [];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags: string[] = [];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minMetacritic: number = 0;

  @IsOptional()
  @IsIn(['any', 'positive', 'very_positive', 'overwhelming'])
  reviewSentiment: ReviewSentiment = 'any';

  @IsOptional()
  @IsArray()
  @IsIn(['windows', 'mac', 'linux'], { each: true })
  platforms: Platform[] = [];

  @IsOptional()
  @IsArray()
  @IsIn(['singleplayer', 'multiplayer', 'coop', 'controller', 'achievements', 'cloudSave'], { each: true })
  playstyle: Playstyle[] = [];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  releaseYearMin: number = 1990;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  releaseYearMax: number = new Date().getFullYear();

  @IsOptional()
  @IsString()
  search: string = '';
}
