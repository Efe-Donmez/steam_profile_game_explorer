import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { SyncJobsService } from './sync-jobs.service';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncJobsController {
  constructor(private readonly syncJobsService: SyncJobsService) {}

  @Get('status')
  async getStatus(@Req() req: Request) {
    const { sub } = req.user as JwtPayload;
    const job = await this.syncJobsService.findLatest(sub, 'library');
    return { status: job?.status ?? 'pending' };
  }
}
