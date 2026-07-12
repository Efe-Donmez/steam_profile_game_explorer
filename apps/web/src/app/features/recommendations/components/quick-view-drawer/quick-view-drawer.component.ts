import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RankedGame } from '../../../../shared/models/recommendation.model';
import { GameDetailModalService } from '../../../../core/services/game-detail-modal.service';

const COVER_GRADIENTS = [
  '135deg,#1B2436,#0E1524',
  '135deg,#26314a,#0E1524',
  '135deg,#1e2b40,#0e1524',
  '135deg,#25203f,#0E1524',
  '135deg,#223349,#0E1524',
  '135deg,#2a2438,#0E1524',
];

@Component({
  selector: 'app-quick-view-drawer',
  standalone: true,
  templateUrl: './quick-view-drawer.component.html',
})
export class QuickViewDrawerComponent {
  @Input() game: RankedGame | null = null;
  @Input() isAiMode = false;
  @Input() accent = '#4CF3FF';
  @Input() genrePercent: number | null = null;

  @Output() close = new EventEmitter<void>();

  constructor(private readonly gameDetailModalService: GameDetailModalService) {}

  openDetail(): void {
    if (!this.game) return;
    this.gameDetailModalService.open(this.game.appid);
  }

  get coverGradient(): string {
    if (!this.game) return '';
    return `linear-gradient(${COVER_GRADIENTS[this.game.appid % COVER_GRADIENTS.length]})`;
  }

  get algoExplanation(): string {
    if (!this.game || this.genrePercent === null) {
      return 'Bu oyun, filtrelerine ve zevk profiline uygun bulundu.';
    }
    return `Profilinin %${this.genrePercent}'i ${this.game.genres[0] ?? 'bu tür'} türüne ait.`;
  }

  stopProp(event: Event): void {
    event.stopPropagation();
  }

  openInSteam(): void {
    if (!this.game) return;
    window.open(`https://store.steampowered.com/app/${this.game.appid}`, '_blank', 'noopener');
  }
}
