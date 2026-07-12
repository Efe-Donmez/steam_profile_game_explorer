import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SteamApiService } from '../steam-api/steam-api.service';
import { UsersService } from '../users/users.service';
import { CatalogService } from '../catalog/catalog.service';
import { ReviewsService } from '../reviews/reviews.service';
import { StoreSyncService } from '../store-sync/store-sync.service';
import { UserProfile, UserProfileDocument } from '../profile/schemas/user-profile.schema';
import { CachedFriend, FriendListCache, FriendListCacheDocument } from './schemas/friend-list-cache.schema';
import { GuestLibraryCache, GuestLibraryCacheDocument, GuestLibraryEntry } from './schemas/guest-library-cache.schema';

const FRIEND_CACHE_STALE_AFTER_MS = 60 * 60 * 1000;
const GUEST_LIBRARY_STALE_AFTER_MS = 3 * 60 * 60 * 1000;
const CATALOG_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const REVIEW_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export interface FriendView {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  personaState: number;
  currentGameName?: string;
  currentGameAppid?: number;
  isSteamCompassUser: boolean;
  friendUserId?: string;
  totalGames?: number;
  totalPlaytimeMinutes?: number;
}

@Injectable()
export class FriendsService {
  constructor(
    private readonly steamApi: SteamApiService,
    private readonly usersService: UsersService,
    private readonly catalogService: CatalogService,
    private readonly reviewsService: ReviewsService,
    private readonly storeSyncService: StoreSyncService,
    @InjectModel(FriendListCache.name) private readonly friendCacheModel: Model<FriendListCacheDocument>,
    @InjectModel(UserProfile.name) private readonly profileModel: Model<UserProfileDocument>,
    @InjectModel(GuestLibraryCache.name) private readonly guestLibraryModel: Model<GuestLibraryCacheDocument>,
  ) {}

  /** Refreshes the cached Steam friend list for `userId` when stale, and returns it either way. */
  private async getFreshFriendCache(userId: string, steamId: string): Promise<CachedFriend[]> {
    const cached = await this.friendCacheModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
    const isFresh = cached && Date.now() - cached.fetchedAt.getTime() < FRIEND_CACHE_STALE_AFTER_MS;
    if (isFresh) {
      return cached!.friends;
    }

    const rawFriends = await this.steamApi.getFriendList(steamId);
    const summaries = await this.steamApi.getPlayerSummaries(rawFriends.map((f) => f.steamId));
    const summaryBySteamId = new Map(summaries.map((s) => [s.steamid, s]));

    const friends: CachedFriend[] = rawFriends.map((f) => {
      const summary = summaryBySteamId.get(f.steamId);
      return {
        steamId: f.steamId,
        personaName: summary?.personaname ?? f.steamId,
        avatarUrl: summary?.avatarfull ?? '',
        personaState: summary?.personastate ?? 0,
        currentGameName: summary?.gameextrainfo,
        currentGameAppid: summary?.gameid ? parseInt(summary.gameid, 10) : undefined,
        friendSince: new Date(f.friendSince * 1000),
      } as CachedFriend;
    });

    const doc = await this.friendCacheModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { friends, fetchedAt: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
    return doc.friends;
  }

  async getFriends(userId: string, steamId: string): Promise<FriendView[]> {
    const friends = await this.getFreshFriendCache(userId, steamId);
    if (friends.length === 0) return [];

    const matchedUsers = await this.usersService.findBySteamIds(friends.map((f) => f.steamId));
    const userBySteamId = new Map(matchedUsers.map((u) => [u.steamId, u]));

    const profiles = await this.profileModel
      .find({ userId: { $in: matchedUsers.map((u) => u._id) } })
      .lean()
      .exec();
    const profileByUserId = new Map(profiles.map((p) => [p.userId.toString(), p]));

    return friends.map((f) => {
      const user = userBySteamId.get(f.steamId);
      const profile = user ? profileByUserId.get(user._id.toString()) : undefined;
      return {
        steamId: f.steamId,
        personaName: f.personaName,
        avatarUrl: f.avatarUrl,
        personaState: f.personaState,
        currentGameName: f.currentGameName,
        currentGameAppid: f.currentGameAppid,
        isSteamCompassUser: !!user,
        friendUserId: user?._id.toString(),
        totalGames: profile?.totalGames,
        totalPlaytimeMinutes: profile?.totalPlaytimeMinutes,
      };
    });
  }

  /** Authorization gate for every friend-scoped profile/recommendations proxy endpoint. */
  async assertIsFriend(viewerUserId: string, viewerSteamId: string, friendUserId: string): Promise<void> {
    const friendUser = await this.usersService.findById(friendUserId);
    if (!friendUser) {
      throw new NotFoundException('Arkadaş bulunamadı');
    }

    await this.assertIsFriendSteamId(viewerUserId, viewerSteamId, friendUser.steamId);
  }

  /** Same gate as `assertIsFriend`, but for guest friends who have no `User` doc to resolve a steamId from. */
  async assertIsFriendSteamId(viewerUserId: string, viewerSteamId: string, friendSteamId: string): Promise<void> {
    const friends = await this.getFreshFriendCache(viewerUserId, viewerSteamId);
    const isFriend = friends.some((f) => f.steamId === friendSteamId);
    if (!isFriend) {
      throw new ForbiddenException('Bu kullanıcı Steam arkadaş listende değil');
    }
  }

  /**
   * Owned-games snapshot for a friend who has never logged into SteamCompass.
   * Cached per `steamId` (shared across every viewer) and refreshed on the
   * same staleness cadence as `library-sync.service.ts`'s catalog/review
   * checks. Missing/stale catalog and review entries are enqueued the same
   * way a real library sync does; achievements and SteamSpy are intentionally
   * NOT triggered here — those are the most expensive per-library Steam calls
   * and are reserved for consented, logged-in accounts.
   */
  async getGuestLibrary(friendSteamId: string): Promise<GuestLibraryEntry[]> {
    const cached = await this.guestLibraryModel.findOne({ steamId: friendSteamId }).exec();
    const isFresh = cached && Date.now() - cached.fetchedAt.getTime() < GUEST_LIBRARY_STALE_AFTER_MS;
    if (isFresh) {
      return cached!.library;
    }

    const ownedGames = await this.steamApi.getOwnedGames(friendSteamId);
    const library: GuestLibraryEntry[] = ownedGames.map((g) => ({
      appid: g.appid,
      playtimeForeverMinutes: g.playtime_forever,
      playtime2WeeksMinutes: g.playtime_2weeks ?? 0,
      ...(g.rtime_last_played ? { lastPlayed: new Date(g.rtime_last_played * 1000) } : {}),
    }));

    const appids = library.map((l) => l.appid);
    const missingCatalog = await this.catalogService.findMissingOrStaleAppids(appids, CATALOG_STALE_AFTER_MS);
    for (const appid of missingCatalog) {
      await this.storeSyncService.enqueueAppDetailsFetch(appid);
    }
    const staleReviews = await this.reviewsService.findStaleOrMissing(appids, REVIEW_STALE_AFTER_MS);
    for (const appid of staleReviews) {
      await this.storeSyncService.enqueueReviewsFetch(appid);
    }

    const doc = await this.guestLibraryModel
      .findOneAndUpdate(
        { steamId: friendSteamId },
        { library, fetchedAt: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
    return doc.library;
  }
}
