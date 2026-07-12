import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, StrategyOptionsWithoutRequest } from 'passport-jwt';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  steamId: string;
}

interface RawJwtPayload extends JwtPayload {
  type: 'access' | 'refresh';
}

function cookieExtractor(req: Request): string | null {
  return req?.cookies?.['access_token'] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    } as StrategyOptionsWithoutRequest);
  }

  validate(payload: RawJwtPayload): JwtPayload {
    // Access and refresh tokens are signed with the same secret and shape,
    // differing only in `type` — without this check, a refresh token that
    // ends up in the `access_token` cookie would be accepted by every
    // JwtAuthGuard-protected route for its full 30-day lifetime instead of
    // the intended 1-hour access-token window.
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Geçersiz token tipi');
    }
    return { sub: payload.sub, steamId: payload.steamId };
  }
}
