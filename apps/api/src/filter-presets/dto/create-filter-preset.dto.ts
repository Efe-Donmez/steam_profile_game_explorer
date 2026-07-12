import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { RecommendationFiltersDto } from '../../recommendations/dto/recommendation-filters.dto';

export class CreateFilterPresetDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @ValidateNested()
  @Type(() => RecommendationFiltersDto)
  filters: RecommendationFiltersDto;
}
