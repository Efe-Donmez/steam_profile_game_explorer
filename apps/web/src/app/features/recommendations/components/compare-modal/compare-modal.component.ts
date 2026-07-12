import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RankedGame } from '../../../../shared/models/recommendation.model';
import { currencySymbol } from '../../../../shared/utils/currency.util';

interface CompareCell {
  text: string;
  best: boolean;
}

interface CompareRow {
  label: string;
  values: CompareCell[];
}

@Component({
  selector: 'app-compare-modal',
  standalone: true,
  templateUrl: './compare-modal.component.html',
})
export class CompareModalComponent {
  @Input() games: RankedGame[] = [];
  @Input() accent = '#4CF3FF';

  @Output() close = new EventEmitter<void>();

  stopProp(event: Event): void {
    event.stopPropagation();
  }

  private platformsLabel(game: RankedGame): string {
    const labels: string[] = [];
    if (game.platforms.windows) labels.push('WIN');
    if (game.platforms.mac) labels.push('MAC');
    if (game.platforms.linux) labels.push('LNX');
    return labels.join('/');
  }

  get rows(): CompareRow[] {
    if (this.games.length === 0) return [];

    const prices = this.games.map((g) => g.priceCents);
    const minPrice = Math.min(...prices);
    const scores = this.games.map((g) => g.metacriticScore ?? 0);
    const maxScore = Math.max(...scores);

    return [
      {
        label: 'Fiyat',
        values: this.games.map((g) => ({
          text: g.isFree ? 'Ücretsiz' : `${currencySymbol(g.currency)}${Math.round(g.priceCents / 100)}`,
          best: g.priceCents === minPrice,
        })),
      },
      {
        label: 'Puan',
        values: this.games.map((g) => ({
          text: g.metacriticScore ? String(g.metacriticScore) : '—',
          best: (g.metacriticScore ?? 0) === maxScore && maxScore > 0,
        })),
      },
      {
        label: 'Tür',
        values: this.games.map((g) => ({ text: g.genres[0] ?? '—', best: false })),
      },
      {
        label: 'Çıkış Yılı',
        values: this.games.map((g) => ({ text: g.releaseYear ? String(g.releaseYear) : '—', best: false })),
      },
      {
        label: 'Platform',
        values: this.games.map((g) => ({ text: this.platformsLabel(g) || '—', best: false })),
      },
    ];
  }
}
