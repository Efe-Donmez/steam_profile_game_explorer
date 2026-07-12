import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { FriendsService } from './friends.service';
import { ProfileService } from '../profile/profile.service';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { GetFacetsRequestDto } from '../recommendations/dto/get-facets-request.dto';
import { CreateRecommendationRequestDto } from '../recommendations/dto/create-recommendation-request.dto';
import { PaginationQueryDto } from '../profile/dto/pagination-query.dto';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(
    private readonly friendsService: FriendsService,
    private readonly profileService: ProfileService,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get()
  getFriends(@Req() req: Request) {
    const { sub, steamId } = req.user as JwtPayload;
    return this.friendsService.getFriends(sub, steamId);
  }

  @Get(':friendUserId/profile')
  async getFriendProfile(@Req() req: Request, @Param('friendUserId') friendUserId: string) {
    const { sub, steamId } = req.user as JwtPayload;
    await this.friendsService.assertIsFriend(sub, steamId, friendUserId);
    return this.profileService.getOrBuildProfile(friendUserId);
  }

  @Get(':friendUserId/top-games')
  async getFriendTopGames(
    @Req() req: Request,
    @Param('friendUserId') friendUserId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const { sub, steamId } = req.user as JwtPayload;
    await this.friendsService.assertIsFriend(sub, steamId, friendUserId);
    return this.profileService.getTopGames(friendUserId, query.page, query.limit);
  }

  // POST, not GET — see GetFacetsRequestDto's doc comment.
  @Post(':friendUserId/recommendations/facets')
  async getFriendFacets(
    @Req() req: Request,
    @Param('friendUserId') friendUserId: string,
    @Body() body: GetFacetsRequestDto,
  ) {
    const { sub, steamId } = req.user as JwtPayload;
    await this.friendsService.assertIsFriend(sub, steamId, friendUserId);
    return this.recommendationsService.getFacets(friendUserId, body.filters);
  }

  @Post(':friendUserId/recommendations')
  async getFriendRecommendations(
    @Req() req: Request,
    @Param('friendUserId') friendUserId: string,
    @Body() body: CreateRecommendationRequestDto,
  ) {
    const { sub, steamId } = req.user as JwtPayload;
    await this.friendsService.assertIsFriend(sub, steamId, friendUserId);
    return this.recommendationsService.recommendForFriend(
      sub,
      friendUserId,
      body.filters,
      body.mode,
      body.sort,
      body.page,
      body.limit,
    );
  }

  // --- Guest friends: Steam friends who have never logged into SteamCompass.
  // No `User` doc exists for these, so they're addressed by `steamId` instead
  // of `friendUserId`, and their DNA is computed on the fly rather than read
  // from `userProfiles`/`steamLibraries`. See FriendsService.getGuestLibrary
  // and ProfileService.buildGuestProfileData.

  @Get('guest/:steamId/profile')
  async getGuestProfile(@Req() req: Request, @Param('steamId') steamId: string) {
    const { sub, steamId: viewerSteamId } = req.user as JwtPayload;
    await this.friendsService.assertIsFriendSteamId(sub, viewerSteamId, steamId);
    const library = await this.friendsService.getGuestLibrary(steamId);
    return this.profileService.buildGuestProfileData(library);
  }

  @Get('guest/:steamId/top-games')
  async getGuestTopGames(
    @Req() req: Request,
    @Param('steamId') steamId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const { sub, steamId: viewerSteamId } = req.user as JwtPayload;
    await this.friendsService.assertIsFriendSteamId(sub, viewerSteamId, steamId);
    const library = await this.friendsService.getGuestLibrary(steamId);
    return this.profileService.getGuestTopGames(library, query.limit);
  }

  // POST, not GET — see GetFacetsRequestDto's doc comment.
  @Post('guest/:steamId/recommendations/facets')
  async getGuestFacets(
    @Req() req: Request,
    @Param('steamId') steamId: string,
    @Body() body: GetFacetsRequestDto,
  ) {
    const { sub, steamId: viewerSteamId } = req.user as JwtPayload;
    await this.friendsService.assertIsFriendSteamId(sub, viewerSteamId, steamId);
    const library = await this.friendsService.getGuestLibrary(steamId);
    return this.recommendationsService.getFacetsForOwned(
      library.map((l) => l.appid),
      body.filters,
    );
  }

  @Post('guest/:steamId/recommendations')
  async getGuestRecommendations(
    @Req() req: Request,
    @Param('steamId') steamId: string,
    @Body() body: CreateRecommendationRequestDto,
  ) {
    const { sub, steamId: viewerSteamId } = req.user as JwtPayload;
    await this.friendsService.assertIsFriendSteamId(sub, viewerSteamId, steamId);
    const library = await this.friendsService.getGuestLibrary(steamId);
    const guestProfile = await this.profileService.buildGuestProfileData(library);
    return this.recommendationsService.recommendForGuest(
      sub,
      steamId,
      library.map((l) => l.appid),
      guestProfile,
      body.filters,
      body.mode,
      body.sort,
      body.page,
      body.limit,
    );
  }
}
