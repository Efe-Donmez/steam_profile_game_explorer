import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from '../users/users.service';
import { LibrarySyncService } from './library-sync.service';

@Injectable()
export class LibrarySyncSchedulerService {
  private readonly logger = new Logger(LibrarySyncSchedulerService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly librarySyncService: LibrarySyncService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async syncAllUsers(): Promise<void> {
    const users = await this.usersService.findAll();
    this.logger.log(`Günlük senkronizasyon kuyruğa alınıyor: ${users.length} kullanıcı`);
    for (const user of users) {
      await this.librarySyncService.enqueueSync(user._id.toString(), user.steamId);
    }
  }
}
