import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SavedFilterPreset, SavedFilterPresetDocument } from './schemas/saved-filter-preset.schema';
import { CreateFilterPresetDto } from './dto/create-filter-preset.dto';

@Injectable()
export class FilterPresetsService {
  constructor(
    @InjectModel(SavedFilterPreset.name) private readonly presetModel: Model<SavedFilterPresetDocument>,
  ) {}

  create(userId: string, dto: CreateFilterPresetDto): Promise<SavedFilterPresetDocument> {
    return this.presetModel.create({
      userId: new Types.ObjectId(userId),
      label: dto.label,
      filters: dto.filters as unknown as Record<string, unknown>,
    });
  }

  findAll(userId: string): Promise<SavedFilterPresetDocument[]> {
    return this.presetModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async remove(userId: string, presetId: string): Promise<void> {
    await this.presetModel
      .deleteOne({ _id: presetId, userId: new Types.ObjectId(userId) })
      .exec();
  }
}
