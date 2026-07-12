import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type SyncStatus = 'pending' | 'running' | 'completed' | 'failed';

@Injectable({ providedIn: 'root' })
export class SyncService {
  constructor(private readonly http: HttpClient) {}

  getStatus(): Promise<{ status: SyncStatus }> {
    return firstValueFrom(
      this.http.get<{ status: SyncStatus }>(`${environment.apiUrl}/sync/status`, { withCredentials: true }),
    );
  }
}
