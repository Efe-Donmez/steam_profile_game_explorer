import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { FilterPresetsService } from './filter-presets.service';
import { CreateFilterPresetDto } from './dto/create-filter-preset.dto';

@Controller('filter-presets')
@UseGuards(JwtAuthGuard)
export class FilterPresetsController {
  constructor(private readonly filterPresetsService: FilterPresetsService) {}

  @Post()
  create(@Req() req: Request, @Body() body: CreateFilterPresetDto) {
    const { sub } = req.user as JwtPayload;
    return this.filterPresetsService.create(sub, body);
  }

  @Get()
  findAll(@Req() req: Request) {
    const { sub } = req.user as JwtPayload;
    return this.filterPresetsService.findAll(sub);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    const { sub } = req.user as JwtPayload;
    return this.filterPresetsService.remove(sub, id);
  }
}
