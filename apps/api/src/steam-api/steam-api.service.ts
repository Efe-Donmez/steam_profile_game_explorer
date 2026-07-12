import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface SteamOwnedGame {
  appid: number;
  name?: string;
  playtime_forever: number;
  playtime_2weeks?: number;
  /** Unix timestamp of the last session; 0 when Steam has no record. */
  rtime_last_played?: number;
}

export interface SteamRecentlyPlayedGame {
  appid: number;
  name?: string;
  playtime_2weeks: number;
  playtime_forever: number;
}

export interface SteamAppDetails {
  name: string;
  genres?: { description: string }[];
  categories?: { description: string }[];
  price_overview?: { initial: number; final: number; currency: string; discount_percent: number };
  is_free?: boolean;
  metacritic?: { score: number };
  release_date?: { date: string };
  header_image?: string;
  capsule_image?: string;
  background?: string;
  short_description?: string;
  screenshots?: { path_full: string }[];
  movies?: { thumbnail?: string }[];
  developers?: string[];
  publishers?: string[];
  platforms?: { windows: boolean; mac: boolean; linux: boolean };
  recommendations?: { total: number };
  achievements?: { total: number };
  controller_support?: string;
  supported_languages?: string;
  dlc?: number[];
}

export interface SteamAppReviewSummary {
  total_positive: number;
  total_negative: number;
  total_reviews?: number;
  /** Steam's own 0-9 review score (9 = Overwhelmingly Positive). */
  review_score?: number;
  review_score_desc: string;
}

export interface SteamPlayerAchievementEntry {
  apiname: string;
  achieved: number;
  unlocktime: number;
  name?: string;
  description?: string;
}

export interface SteamGlobalAchievementEntry {
  name: string;
  percent: number;
}

export interface SteamFriend {
  steamId: string;
  friendSince: number;
}

export interface SteamPlayerSummary {
  steamid: string;
  personaname: string;
  avatarfull: string;
  personastate: number;
  communityvisibilitystate: number;
  gameid?: string;
  gameextrainfo?: string;
}

@Injectable()
export class SteamApiService {
  private readonly logger = new Logger(SteamApiService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async getOwnedGames(steamId: string): Promise<SteamOwnedGame[]> {
    const url = 'https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/';
    const { data } = await firstValueFrom(
      this.http.get(url, {
        params: {
          key: this.config.get<string>('STEAM_API_KEY'),
          steamid: steamId,
          include_appinfo: true,
          include_played_free_games: true,
          format: 'json',
        },
      }),
    );
    return data?.response?.games ?? [];
  }

  async getRecentlyPlayedGames(steamId: string): Promise<SteamRecentlyPlayedGame[]> {
    const url = 'https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/';
    try {
      const { data } = await firstValueFrom(
        this.http.get(url, {
          params: { key: this.config.get<string>('STEAM_API_KEY'), steamid: steamId, format: 'json' },
        }),
      );
      return data?.response?.games ?? [];
    } catch (err) {
      this.logger.warn(`GetRecentlyPlayedGames başarısız: steamId=${steamId} ${(err as Error).message}`);
      return [];
    }
  }

  async getSteamLevel(steamId: string): Promise<number | null> {
    const url = 'https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/';
    try {
      const { data } = await firstValueFrom(
        this.http.get(url, {
          params: { key: this.config.get<string>('STEAM_API_KEY'), steamid: steamId },
        }),
      );
      return data?.response?.player_level ?? null;
    } catch (err) {
      this.logger.warn(`GetSteamLevel başarısız: steamId=${steamId} ${(err as Error).message}`);
      return null;
    }
  }

  async getAppDetails(appid: number): Promise<SteamAppDetails | null> {
    const url = 'https://store.steampowered.com/api/appdetails';
    try {
      // Without `cc`, Steam infers the price region from the outbound server
      // IP rather than a fixed locale, so `priceCents`/`currency` could drift
      // per-request; pin the region to Turkey so every game is priced in the
      // same currency (USD — Steam moved the Turkey region off TRY in 2024;
      // the actual code is stored per-game and aggregated into the profile).
      const { data } = await firstValueFrom(
        this.http.get(url, { params: { appids: appid, l: 'turkish', cc: 'tr' } }),
      );
      const entry = data?.[appid];
      if (!entry?.success) {
        return null;
      }
      return entry.data;
    } catch (err) {
      this.logger.warn(`appdetails çağrısı başarısız: appid=${appid} ${(err as Error).message}`);
      return null;
    }
  }

  async getAppReviews(appid: number): Promise<SteamAppReviewSummary | null> {
    const url = `https://store.steampowered.com/appreviews/${appid}`;
    try {
      const { data } = await firstValueFrom(
        this.http.get(url, { params: { json: 1, language: 'all', purchase_type: 'all' } }),
      );
      if (data?.success !== 1) {
        return null;
      }
      return data.query_summary;
    } catch (err) {
      this.logger.warn(`appreviews çağrısı başarısız: appid=${appid} ${(err as Error).message}`);
      return null;
    }
  }

  async getPlayerAchievements(steamId: string, appid: number): Promise<SteamPlayerAchievementEntry[] | null> {
    const url = 'https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/';
    try {
      const { data } = await firstValueFrom(
        this.http.get(url, {
          params: { appid, key: this.config.get<string>('STEAM_API_KEY'), steamid: steamId, l: 'turkish' },
        }),
      );
      if (!data?.playerstats?.success) {
        return null;
      }
      return data.playerstats.achievements ?? [];
    } catch (err) {
      this.logger.warn(
        `GetPlayerAchievements başarısız: steamId=${steamId} appid=${appid} ${(err as Error).message}`,
      );
      return null;
    }
  }

  async getGlobalAchievementPercentages(appid: number): Promise<SteamGlobalAchievementEntry[] | null> {
    const url = 'https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/';
    try {
      const { data } = await firstValueFrom(this.http.get(url, { params: { gameid: appid } }));
      return data?.achievementpercentages?.achievements ?? [];
    } catch (err) {
      this.logger.warn(`GetGlobalAchievementPercentagesForApp başarısız: appid=${appid} ${(err as Error).message}`);
      return null;
    }
  }

  async getFriendList(steamId: string): Promise<SteamFriend[]> {
    const url = 'https://api.steampowered.com/ISteamUser/GetFriendList/v1/';
    try {
      const { data } = await firstValueFrom(
        this.http.get(url, {
          params: { key: this.config.get<string>('STEAM_API_KEY'), steamid: steamId, relationship: 'friend' },
        }),
      );
      const friends = data?.friendslist?.friends ?? [];
      return friends.map((f: { steamid: string; friend_since: number }) => ({
        steamId: f.steamid,
        friendSince: f.friend_since,
      }));
    } catch (err) {
      // Private arkadaş listesi Steam'den 401 döner; boş liste dönmek diğer
      // metodlardaki (getRecentlyPlayedGames vb.) "sessizce eksik veri" deseniyle tutarlı.
      this.logger.warn(`GetFriendList başarısız: steamId=${steamId} ${(err as Error).message}`);
      return [];
    }
  }

  async getPlayerSummaries(steamIds: string[]): Promise<SteamPlayerSummary[]> {
    if (steamIds.length === 0) return [];
    const url = 'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/';
    try {
      // Steam kabul ediyor ama 100'den fazla id'de sonuçları kısıtlayabiliyor;
      // arkadaş listeleri pratikte bu sınırın çok altında kalıyor, o yüzden
      // burada ayrıca batch'lemiyoruz.
      const { data } = await firstValueFrom(
        this.http.get(url, {
          params: { key: this.config.get<string>('STEAM_API_KEY'), steamids: steamIds.join(',') },
        }),
      );
      return data?.response?.players ?? [];
    } catch (err) {
      this.logger.warn(`GetPlayerSummaries başarısız: ${(err as Error).message}`);
      return [];
    }
  }
}
