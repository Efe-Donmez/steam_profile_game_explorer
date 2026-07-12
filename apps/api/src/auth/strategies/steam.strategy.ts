import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import {
  SteamOpenIdStrategy,
  SteamOpenIdStrategyOptionsWithProfile,
  SteamOpenIdUserProfile,
} from 'passport-steam-openid';
import { SteamFetchHttpClient } from './steam-http-client';

@Injectable()
export class SteamStrategy extends PassportStrategy(SteamOpenIdStrategy, 'steam-openid') {
  constructor(config: ConfigService) {
    const options: SteamOpenIdStrategyOptionsWithProfile = {
      returnURL: config.get<string>('STEAM_RETURN_URL')!,
      profile: true,
      apiKey: config.get<string>('STEAM_API_KEY')!,
      // Works around a bug in the library's default http client — see
      // steam-http-client.ts for details.
      httpClient: new SteamFetchHttpClient(),
    };
    super(options);
  }

  validate(_req: Request, _identifier: string, profile: SteamOpenIdUserProfile): SteamOpenIdUserProfile {
    return profile;
  }
}
