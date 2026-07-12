import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';

const ACCESS_TOKEN_TTL = '1h';
const ACCESS_TOKEN_COOKIE_MAX_AGE_MS = 60 * 60 * 1000;
const REFRESH_TOKEN_TTL = '30d';
const REFRESH_TOKEN_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  private signAccessToken(user: UserDocument): string {
    return this.jwtService.sign(
      { sub: user._id.toString(), steamId: user.steamId, type: 'access' },
      { expiresIn: ACCESS_TOKEN_TTL },
    );
  }

  private signRefreshToken(user: UserDocument): string {
    return this.jwtService.sign(
      { sub: user._id.toString(), steamId: user.steamId, type: 'refresh' },
      { expiresIn: REFRESH_TOKEN_TTL },
    );
  }

  async issueSession(user: UserDocument, res: Response): Promise<void> {
    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.setRefreshTokenHash(user._id.toString(), refreshTokenHash);
    this.setAuthCookies(res, accessToken, refreshToken);
  }

  setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const secure = this.config.get<string>('NODE_ENV') === 'production';
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE_MS,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/auth',
      maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
    });
  }

  clearAuthCookies(res: Response): void {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/auth' });
  }

  async refreshSession(refreshToken: string | undefined, res: Response): Promise<void> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token bulunamadı');
    }

    let payload: { sub: string; type: string };
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token geçersiz');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Geçersiz token tipi');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user?.jwtRefreshTokenHash) {
      throw new UnauthorizedException('Oturum bulunamadı');
    }

    const isValid = await bcrypt.compare(refreshToken, user.jwtRefreshTokenHash);
    if (!isValid) {
      throw new UnauthorizedException('Refresh token eşleşmedi');
    }

    await this.issueSession(user, res);
  }

  async logout(userId: string, res: Response): Promise<void> {
    await this.usersService.setRefreshTokenHash(userId, null);
    this.clearAuthCookies(res);
  }
}
