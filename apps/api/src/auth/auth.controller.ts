import { Controller, Get, NotFoundException, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { SteamOpenIdUserProfile } from 'passport-steam-openid';
import { AuthService } from './auth.service';
import { SteamAuthGuard } from './guards/steam-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './strategies/jwt.strategy';
import { LibrarySyncService } from '../steam/library-sync.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly librarySyncService: LibrarySyncService,
    private readonly config: ConfigService,
  ) {}

  @Get('steam')
  @UseGuards(SteamAuthGuard)
  steamLogin(): void {
    // SteamAuthGuard handles the redirect to Steam's OpenID endpoint.
  }

  @Get('steam/return')
  @UseGuards(SteamAuthGuard)
  async steamReturn(@Req() req: Request, @Res() res: Response): Promise<void> {
    const profile = req.user as SteamOpenIdUserProfile;
    const user = await this.usersService.upsertFromSteamProfile(profile);
    await this.authService.issueSession(user, res);
    await this.librarySyncService.enqueueSync(user._id.toString(), user.steamId);

    const webUrl = this.config.get<string>('WEB_URL') ?? 'http://localhost:4200';
    res.redirect(`${webUrl}/sync`);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const { sub } = req.user as JwtPayload;
    const user = await this.usersService.findById(sub);
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    return {
      steamId: user.steamId,
      personaName: user.personaName,
      avatarUrl: user.avatarUrl,
      steamLevel: user.steamLevel,
      isPrivate: user.profileVisibility !== 3,
    };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.authService.refreshSession(req.cookies?.['refresh_token'], res);
    res.status(204).send();
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const { sub } = req.user as JwtPayload;
    await this.authService.logout(sub, res);
    res.status(204).send();
  }
}
