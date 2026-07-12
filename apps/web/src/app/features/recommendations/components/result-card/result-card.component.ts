import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CornerBracketsComponent } from '../../../../shared/components/corner-brackets/corner-brackets.component';
import { RankedGame } from '../../../../shared/models/recommendation.model';
import { currencySymbol } from '../../../../shared/utils/currency.util';

const REVIEW_LABELS: [RegExp, string][] = [
  [/overwhelmingly positive/i, 'Muhteşem'],
  [/very positive/i, 'Çok Olumlu'],
  [/mostly positive|positive/i, 'Olumlu'],
  [/mixed/i, 'Karışık'],
  [/negative/i, 'Olumsuz'],
];

const COVER_GRADIENTS = [
  '135deg,#1B2436,#0E1524',
  '135deg,#26314a,#0E1524',
  '135deg,#1e2b40,#0e1524',
  '135deg,#25203f,#0E1524',
  '135deg,#223349,#0E1524',
  '135deg,#2a2438,#0E1524',
];

@Component({
  selector: 'app-result-card',
  standalone: true,
  imports: [CornerBracketsComponent],
  templateUrl: './result-card.component.html',
})
export class ResultCardComponent {
  @Input({ required: true }) game!: RankedGame;
  @Input() compareSelected = false;
  @Input() saved = false;
  @Input() isAiMode = false;
  @Input() accent = '#4CF3FF';

  @Output() toggleCompare = new EventEmitter<void>();
  @Output() toggleSave = new EventEmitter<void>();
  @Output() openQuickView = new EventEmitter<void>();

  get coverGradient(): string {
    return `linear-gradient(${COVER_GRADIENTS[this.game.appid % COVER_GRADIENTS.length]})`;
  }

  get cur(): string {
    return currencySymbol(this.game.currency);
  }

  get platformsLabel(): string {
    const p = this.game.platforms;
    const labels: string[] = [];
    if (p.windows) labels.push('WIN');
    if (p.mac) labels.push('MAC');
    if (p.linux) labels.push('LNX');
    return labels.join('/');
  }

  get hasCoop(): boolean {
    return this.game.categories.some((c) => /co-op/i.test(c));
  }

  get hasController(): boolean {
    return this.game.categories.some((c) => /controller support/i.test(c));
  }

  get priceDisplay(): number {
    return Math.round(this.game.priceCents / 100);
  }

  get originalPriceDisplay(): number | null {
    if (this.game.discountPercent <= 0 || this.game.discountPercent >= 100) return null;
    const original = this.game.priceCents / (1 - this.game.discountPercent / 100);
    return Math.round(original / 100);
  }

  get reviewLabel(): string {
    if (!this.game.reviewScoreDesc) return 'Yorum Yok';
    const match = REVIEW_LABELS.find(([re]) => re.test(this.game.reviewScoreDesc!));
    return match ? match[1] : this.game.reviewScoreDesc;
  }
}
