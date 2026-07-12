import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RecommendationFilters, RecommendationResponse, FacetsResponse, RecommendationSort } from '../../shared/models/recommendation.model';
import { RecommendationMode } from './mode.service';

@Injectable({ providedIn: 'root' })
export class RecommendationsService {
  constructor(private readonly http: HttpClient) {}

  recommend(
    filters: RecommendationFilters,
    mode: RecommendationMode,
    sort: RecommendationSort,
    page: number,
    limit: number,
  ): Promise<RecommendationResponse> {
    return firstValueFrom(
      this.http.post<RecommendationResponse>(
        `${environment.apiUrl}/recommendations`,
        { filters, mode, sort, page, limit },
        { withCredentials: true },
      ),
    );
  }

  getFacets(filters: RecommendationFilters): Promise<FacetsResponse> {
    // POST with a JSON body, not GET with query params: a query string
    // collapses a single-selected genre/tag/platform/playstyle down to a
    // bare string, which the backend DTO's @IsArray() rejects with a 400 the
    // moment exactly one is picked.
    return firstValueFrom(
      this.http.post<FacetsResponse>(
        `${environment.apiUrl}/recommendations/facets`,
        { filters },
        { withCredentials: true },
      ),
    );
  }

  refine(requestId: string, message: string): Promise<RecommendationResponse & { filterNote: string }> {
    return firstValueFrom(
      this.http.post<RecommendationResponse & { filterNote: string }>(
        `${environment.apiUrl}/recommendations/${requestId}/refine`,
        { message },
        { withCredentials: true },
      ),
    );
  }
}
