import { Component, effect, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameDetail, ProfileService } from '../../core/services/profile.service';
import { GameDetailModalService } from '../../core/services/game-detail-modal.service';
import { CornerBracketsComponent } from '../../shared/components/corner-brackets/corner-brackets.component';
import { currencySymbol } from '../../shared/utils/currency.util';

/**
 * Centered modal with the full per-game deep dive — mounted once at the app
 * root (see app.component.html) and opened from anywhere via
 * GameDetailModalService.open(appid). Renders nothing while closed.
 */
@Component({
  selector: 'app-game-detail-modal',
  standalone: true,
  imports: [RouterLink, CornerBracketsComponent],
  templateUrl: './game-detail.component.html',
})
export class GameDetailComponent {
  readonly loading = signal(false);
  readonly notFound = signal(false);
  readonly game = signal<GameDetail | null>(null);

  constructor(
    private readonly profileService: ProfileService,
    protected readonly modalService: GameDetailModalService,
  ) {
    effect(() => {
      const appid = this.modalService.openAppid();
      if (appid === null) {
        this.game.set(null);
        this.notFound.set(false);
        return;
      }
      void this.load(appid);
    });
  }

  private async load(appid: number): Promise<void> {
    this.loading.set(true);
    this.notFound.set(false);
    this.game.set(null);
    try {
      this.game.set(await this.profileService.getGameDetail(appid));
    } catch {
      this.notFound.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  close(): void {
    this.modalService.close();
  }

  get cur(): string {
    return currencySymbol(this.game()?.currency);
  }

  get achievementPct(): number {
    return this.game()?.achievementCompletion ?? 0;
  }

  get steamUrl(): string {
    return `https://store.steampowered.com/app/${this.game()?.appid}`;
  }

  get steamDbUrl(): string {
    return `https://steamdb.info/app/${this.game()?.appid}`;
  }

  get hltbUrl(): string {
    return `https://howlongtobeat.com/?q=${encodeURIComponent(this.game()?.name ?? '')}`;
  }

  formatDate(value?: string): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('tr-TR');
  }

  formatCurrency(cents: number): string {
    return (cents / 100).toLocaleString('tr-TR', { maximumFractionDigits: 0 });
  }

  formatCostPerHour(centsPerHour?: number): string {
    if (centsPerHour === undefined) return '—';
    return this.cur + (centsPerHour / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '/sa';
  }

  formatMinutesLong(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours > 0 ? `${hours} sa ${rest} dk` : `${rest} dk`;
  }
}
