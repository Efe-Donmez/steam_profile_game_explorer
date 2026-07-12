import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface SteamSpyAppDetails {
  owners: string;
  average_forever: number;
  average_2weeks: number;
  // SteamSpy returns `[]` (empty array) instead of `{}` when a game has no
  // community tags, so consumers must guard with Array.isArray.
  tags?: Record<string, number> | unknown[];
  positive?: number;
  negative?: number;
  ccu?: number;
  price?: string;
  initialprice?: string;
  developer?: string;
  publisher?: string;
}

export interface SteamSpyListEntry {
  appid: number;
  name: string;
}

export type SteamSpyTopList = 'top100in2weeks' | 'top100forever' | 'top100owned';

/**
 * SteamSpy (steamspy.com) is an unofficial, community-run data source.
 * Every field derived from it must be surfaced to the user as "tahmini" (estimated).
 */
@Injectable()
export class SteamSpyApiService {
  private readonly logger = new Logger(SteamSpyApiService.name);

  constructor(private readonly http: HttpService) {}

  /** Top-100 charts; each is a single request returning appid→summary. */
  async getTopList(list: SteamSpyTopList): Promise<SteamSpyListEntry[]> {
    return this.fetchList({ request: list });
  }

  /** Every game SteamSpy knows in a genre; caller should cap the result. */
  async getGenreList(genre: string): Promise<SteamSpyListEntry[]> {
    return this.fetchList({ request: 'genre', genre });
  }

  private async fetchList(params: Record<string, string>): Promise<SteamSpyListEntry[]> {
    const url = 'https://steamspy.com/api.php';
    try {
      const { data } = await firstValueFrom(this.http.get(url, { params }));
      if (!data || typeof data !== 'object') return [];
      return Object.values(data)
        .filter(
          (e): e is { appid: number; name: string } =>
            !!e && typeof (e as { appid?: unknown }).appid === 'number' && typeof (e as { name?: unknown }).name === 'string',
        )
        .map((e) => ({ appid: e.appid, name: e.name }));
    } catch (err) {
      this.logger.warn(`SteamSpy liste çağrısı başarısız: ${JSON.stringify(params)} ${(err as Error).message}`);
      return [];
    }
  }

  async getAppDetails(appid: number): Promise<SteamSpyAppDetails | null> {
    const url = 'https://steamspy.com/api.php';
    try {
      const { data } = await firstValueFrom(this.http.get(url, { params: { request: 'appdetails', appid } }));
      if (!data || typeof data.average_forever !== 'number') {
        return null;
      }
      return data;
    } catch (err) {
      this.logger.warn(`SteamSpy çağrısı başarısız: appid=${appid} ${(err as Error).message}`);
      return null;
    }
  }
}
