import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SteamApiService } from './steam-api.service';

@Module({
  imports: [HttpModule.register({ timeout: 15000 })],
  providers: [SteamApiService],
  exports: [SteamApiService],
})
export class SteamApiModule {}
