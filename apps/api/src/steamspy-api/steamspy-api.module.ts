import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SteamSpyApiService } from './steamspy-api.service';

@Module({
  imports: [HttpModule.register({ timeout: 15000 })],
  providers: [SteamSpyApiService],
  exports: [SteamSpyApiService],
})
export class SteamSpyApiModule {}
