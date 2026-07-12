import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ProfileService } from './profile.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Controller('profile/me')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@Req() req: Request) {
    const { sub } = req.user as JwtPayload;
    return this.profileService.getOrBuildProfile(sub);
  }

  @Get('value-map')
  getValueMap(@Req() req: Request) {
    const { sub } = req.user as JwtPayload;
    return this.profileService.getValueMap(sub);
  }

  @Get('weekly-trend')
  getWeeklyTrend(@Req() req: Request) {
    const { sub } = req.user as JwtPayload;
    return this.profileService.getWeeklyPlaytimeTrend(sub);
  }

  @Get('top-games')
  getTopGames(@Req() req: Request, @Query() query: PaginationQueryDto) {
    const { sub } = req.user as JwtPayload;
    return this.profileService.getTopGames(sub, query.page, query.limit);
  }

  @Get('top-studios')
  getTopStudios(@Req() req: Request, @Query() query: PaginationQueryDto) {
    const { sub } = req.user as JwtPayload;
    return this.profileService.getTopStudios(sub, query.page, query.limit);
  }

  @Get('library')
  getLibrary(
    @Req() req: Request,
    @Query('genre') genre?: string,
    @Query('tag') tag?: string,
    @Query('year') year?: string,
    @Query('metacriticBucket') metacriticBucket?: string,
    @Query('sentiment') sentiment?: string,
    @Query('neverPlayed') neverPlayed?: string,
    @Query('platform') platform?: string,
    @Query('recency') recency?: string,
    @Query('playtimeBucket') playtimeBucket?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('limit') limit?: string,
  ) {
    const { sub } = req.user as JwtPayload;
    return this.profileService.getLibraryGames(sub, {
      genre,
      tag,
      year: year !== undefined ? parseInt(year, 10) : undefined,
      metacriticBucket,
      sentiment,
      neverPlayed: neverPlayed === 'true',
      platform,
      recency,
      playtimeBucket,
      search,
      sort,
      limit: limit !== undefined ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('games/:appid')
  async getGameDetail(@Req() req: Request, @Param('appid', ParseIntPipe) appid: number) {
    const { sub } = req.user as JwtPayload;
    const detail = await this.profileService.getGameDetail(sub, appid);
    if (!detail) {
      throw new NotFoundException('Oyun bulunamadı');
    }
    return detail;
  }
}
