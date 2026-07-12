import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RecommendationFilters } from '../../shared/models/recommendation.model';

export interface SavedFilterPreset {
  _id: string;
  label: string;
  filters: RecommendationFilters;
}

@Injectable({ providedIn: 'root' })
export class FilterPresetsService {
  constructor(private readonly http: HttpClient) {}

  findAll(): Promise<SavedFilterPreset[]> {
    return firstValueFrom(
      this.http.get<SavedFilterPreset[]>(`${environment.apiUrl}/filter-presets`, { withCredentials: true }),
    );
  }

  create(label: string, filters: RecommendationFilters): Promise<SavedFilterPreset> {
    return firstValueFrom(
      this.http.post<SavedFilterPreset>(
        `${environment.apiUrl}/filter-presets`,
        { label, filters },
        { withCredentials: true },
      ),
    );
  }

  remove(id: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${environment.apiUrl}/filter-presets/${id}`, { withCredentials: true }),
    );
  }
}
