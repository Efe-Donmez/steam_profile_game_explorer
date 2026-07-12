import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SavedFilterPreset, SavedFilterPresetSchema } from './schemas/saved-filter-preset.schema';
import { FilterPresetsService } from './filter-presets.service';
import { FilterPresetsController } from './filter-presets.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: SavedFilterPreset.name, schema: SavedFilterPresetSchema }])],
  controllers: [FilterPresetsController],
  providers: [FilterPresetsService],
  exports: [FilterPresetsService],
})
export class FilterPresetsModule {}
