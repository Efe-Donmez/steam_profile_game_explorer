import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserProfile, TopGame } from './profile.service';
import {
  FacetsResponse,
  RecommendationFilters,
  RecommendationResponse,
  RecommendationSort,
} from '../../shared/models/recommendation.model';
import { RecommendationMode } from './mode.service';

export interface Friend {
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

@Injectable({ providedIn: 'root' })
export class FriendsService {
  constructor(private readonly http: HttpClient) {}

  getFriends(): Promise<Friend[]> {
    return firstValueFrom(
      this.http.get<Friend[]>(`${environment.apiUrl}/friends`, { withCredentials: true }),
    );
  }

  getFriendProfile(friendUserId: string): Promise<UserProfile> {
    return firstValueFrom(
      this.http.get<UserProfile>(`${environment.apiUrl}/friends/${friendUserId}/profile`, {
        withCredentials: true,
      }),
    );
  }

  getFriendTopGames(friendUserId: string, limit = 10): Promise<{ total: number; items: TopGame[] }> {
    return firstValueFrom(
      this.http.get<{ total: number; items: TopGame[] }>(
        `${environment.apiUrl}/friends/${friendUserId}/top-games`,
        { withCredentials: true, params: { limit } },
      ),
    );
  }

  getFriendFacets(friendUserId: string, filters: RecommendationFilters): Promise<FacetsResponse> {
    // POST body, not GET query params — see RecommendationsService.getFacets().
    return firstValueFrom(
      this.http.post<FacetsResponse>(
        `${environment.apiUrl}/friends/${friendUserId}/recommendations/facets`,
        { filters },
        { withCredentials: true },
      ),
    );
  }

  getFriendRecommendations(
    friendUserId: string,
    filters: RecommendationFilters,
    mode: RecommendationMode,
    sort: RecommendationSort,
    page: number,
    limit: number,
  ): Promise<RecommendationResponse> {
    return firstValueFrom(
      this.http.post<RecommendationResponse>(
        `${environment.apiUrl}/friends/${friendUserId}/recommendations`,
        { filters, mode, sort, page, limit },
        { withCredentials: true },
      ),
    );
  }

  // --- Guest friends: Steam friends who have never logged into SteamCompass,
  // addressed by steamId instead of friendUserId. ---

  getGuestProfile(steamId: string): Promise<UserProfile> {
    return firstValueFrom(
      this.http.get<UserProfile>(`${environment.apiUrl}/friends/guest/${steamId}/profile`, {
        withCredentials: true,
      }),
    );
  }

  getGuestTopGames(steamId: string, limit = 10): Promise<{ total: number; items: TopGame[] }> {
    return firstValueFrom(
      this.http.get<{ total: number; items: TopGame[] }>(
        `${environment.apiUrl}/friends/guest/${steamId}/top-games`,
        { withCredentials: true, params: { limit } },
      ),
    );
  }

  getGuestFacets(steamId: string, filters: RecommendationFilters): Promise<FacetsResponse> {
    // POST body, not GET query params — see RecommendationsService.getFacets().
    return firstValueFrom(
      this.http.post<FacetsResponse>(
        `${environment.apiUrl}/friends/guest/${steamId}/recommendations/facets`,
        { filters },
        { withCredentials: true },
      ),
    );
  }

  getGuestRecommendations(
    steamId: string,
    filters: RecommendationFilters,
    mode: RecommendationMode,
    sort: RecommendationSort,
    page: number,
    limit: number,
  ): Promise<RecommendationResponse> {
    return firstValueFrom(
      this.http.post<RecommendationResponse>(
        `${environment.apiUrl}/friends/guest/${steamId}/recommendations`,
        { filters, mode, sort, page, limit },
        { withCredentials: true },
      ),
    );
  }
}
