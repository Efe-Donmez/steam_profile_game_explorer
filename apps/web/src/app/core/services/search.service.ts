import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SearchResult {
  appid: number;
  name: string;
  headerImage?: string;
  capsuleImage?: string;
  owned: boolean;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  constructor(private readonly http: HttpClient) {}

  search(q: string): Promise<SearchResult[]> {
    return firstValueFrom(
      this.http.get<SearchResult[]>(`${environment.apiUrl}/search`, { withCredentials: true, params: { q } }),
    );
  }
}
