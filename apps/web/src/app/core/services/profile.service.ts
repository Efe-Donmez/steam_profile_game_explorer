import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CoverageCounts {
  fetched: number;
  total: number;
}

export interface ValueLeagueEntry {
  appid: number;
  name: string;
  headerImage?: string;
  capsuleImage?: string;
  basePriceCents: number;
  hours: number;
  centsPerHour: number;
}

export interface RecentTempoGame {
  appid: number;
  name: string;
  headerImage?: string;
  capsuleImage?: string;
  minutes2Weeks: number;
}

export interface UserProfile {
  genreWeights: Record<string, number>;
  tagWeights: Record<string, number>;
  totalGames: number;
  totalPlaytimeMinutes: number;
  totalEstimatedSpendCents: number;
  currency?: string;
  libraryValueCents: number;
  avgPricePaid: number;
  avgMetacriticPreference: number;
  avgReviewScorePreference: number;
  featureCoverage: {
    multiplayer: number;
    coop: number;
    controller: number;
    cloudSave: number;
    achievements: number;
    singleplayer: number;
  };
  nicheScore: number;
  avgAchievementCompletion: number;
  rarestAchievements: {
    appid: number;
    gameName: string;
    headerImage?: string;
    capsuleImage?: string;
    apiName: string;
    displayName: string;
    unlockTime?: string;
    globalUnlockPercent: number;
  }[];
  releaseYearHistogram: Record<string, number>;
  metacriticHistogram: Record<string, number>;
  reviewSentimentBuckets: { excellent: number; positive: number; mixed: number; negative: number };
  neverPlayedCount: number;
  neverPlayedValueCents: number;
  freeGameCount: number;
  paidGameCount: number;
  bestValueGames: ValueLeagueEntry[];
  worstValueGames: ValueLeagueEntry[];
  recentTempo: { games2Weeks: number; minutes2Weeks: number; topRecent: RecentTempoGame[] };
  platformCoverage: { windows: number; mac: number; linux: number };
  oldestGameYear?: number;
  newestGameYear?: number;
  medianReleaseYear?: number;
  coverage: {
    catalog: CoverageCounts;
    reviews: CoverageCounts;
    achievements: CoverageCounts;
    steamSpy: CoverageCounts;
  };
  playtimeBuckets: {
    never: number;
    under1h: number;
    h1to5: number;
    h5to20: number;
    h20to100: number;
    over100h: number;
  };
  recencyBuckets: {
    last2Weeks: number;
    lastMonth: number;
    last6Months: number;
    lastYear: number;
    older: number;
    unknown: number;
  };
  perfectGamesCount: number;
  totalAchievementsUnlocked: number;
  overallCostPerHourCents: number;
}

export interface ValueMapPoint {
  appid: number;
  name: string;
  priceCents: number;
  hours: number;
  isFree: boolean;
  genre?: string;
}

export interface LibraryGame {
  appid: number;
  name: string;
  headerImage?: string;
  capsuleImage?: string;
  genres: string[];
  tags: string[];
  releaseYear?: number;
  metacriticScore?: number;
  reviewScoreDesc?: string;
  reviewPositivePercent?: number;
  isFree: boolean;
  basePriceCents: number;
  priceCents: number;
  platforms?: { windows: boolean; mac: boolean; linux: boolean };
  hours: number;
  playtime2WeeksMinutes: number;
  lastPlayed?: string;
  achievementCompletion?: number;
  achievementsUnlocked?: number;
  achievementsTotal?: number;
  centsPerHour?: number;
}

export interface LibraryQuery {
  genre?: string;
  tag?: string;
  year?: number;
  metacriticBucket?: string;
  sentiment?: string;
  neverPlayed?: boolean;
  platform?: string;
  recency?: string;
  playtimeBucket?: string;
  search?: string;
  sort?: string;
  limit?: number;
}

export interface GameDetail extends LibraryGame {
  owned: boolean;
  backgroundImage?: string;
  screenshots: string[];
  shortDescription?: string;
  categories: string[];
  developers: string[];
  publishers: string[];
  releaseDate?: string;
  recommendationsTotal?: number;
  controllerSupport?: string;
  dlcCount: number;
  discountPercent: number;
  currency?: string;
  totalReviews?: number;
  rarestUnlocked: { apiName: string; displayName: string; unlockTime?: string; globalUnlockPercent?: number }[];
  allAchievements: {
    apiName: string;
    displayName: string;
    achieved: boolean;
    unlockTime?: string;
    globalUnlockPercent?: number;
  }[];
  steamSpy: { ownersRangeLabel: string; ccu: number; tags: string[] } | null;
}

export interface TopGame {
  appid: number;
  name: string;
  genres: string[];
  headerImage?: string;
  capsuleImage?: string;
  metacriticScore?: number;
  lastPlayed?: string;
  hours: number;
}

export interface TopStudio {
  name: string;
  gameCount: number;
  totalHours: number;
}

export interface WeeklyTrend {
  hasEnoughData: boolean;
  weeks: { weekStart: string; minutes: number }[];
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private readonly http: HttpClient) {}

  getProfile(): Promise<UserProfile> {
    return firstValueFrom(
      this.http.get<UserProfile>(`${environment.apiUrl}/profile/me`, { withCredentials: true }),
    );
  }

  getValueMap(): Promise<ValueMapPoint[]> {
    return firstValueFrom(
      this.http.get<ValueMapPoint[]>(`${environment.apiUrl}/profile/me/value-map`, { withCredentials: true }),
    );
  }

  getTopGames(limit = 15): Promise<{ total: number; items: TopGame[] }> {
    return firstValueFrom(
      this.http.get<{ total: number; items: TopGame[] }>(`${environment.apiUrl}/profile/me/top-games`, {
        withCredentials: true,
        params: { limit },
      }),
    );
  }

  getTopStudios(limit = 5): Promise<{ total: number; items: TopStudio[] }> {
    return firstValueFrom(
      this.http.get<{ total: number; items: TopStudio[] }>(`${environment.apiUrl}/profile/me/top-studios`, {
        withCredentials: true,
        params: { limit },
      }),
    );
  }

  getLibrary(query: LibraryQuery): Promise<{ total: number; items: LibraryGame[] }> {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = String(value);
      }
    }
    return firstValueFrom(
      this.http.get<{ total: number; items: LibraryGame[] }>(`${environment.apiUrl}/profile/me/library`, {
        withCredentials: true,
        params,
      }),
    );
  }

  getWeeklyTrend(): Promise<WeeklyTrend> {
    return firstValueFrom(
      this.http.get<WeeklyTrend>(`${environment.apiUrl}/profile/me/weekly-trend`, { withCredentials: true }),
    );
  }

  getGameDetail(appid: number): Promise<GameDetail> {
    return firstValueFrom(
      this.http.get<GameDetail>(`${environment.apiUrl}/profile/me/games/${appid}`, { withCredentials: true }),
    );
  }
}
