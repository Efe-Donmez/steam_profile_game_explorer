import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  steamLevel?: number;
  isPrivate: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<AuthUser | null>(null);
  readonly loading = signal(false);

  constructor(private readonly http: HttpClient) {}

  loginWithSteam(): void {
    window.location.href = `${environment.apiUrl}/auth/steam`;
  }

  async fetchMe(): Promise<AuthUser | null> {
    this.loading.set(true);
    try {
      const user = await firstValueFrom(
        this.http.get<AuthUser>(`${environment.apiUrl}/auth/me`, { withCredentials: true }),
      );
      this.user.set(user);
      return user;
    } catch {
      this.user.set(null);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true }));
    this.user.set(null);
  }
}
