import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { LibraryGame } from '../../../../core/services/profile.service';

/**
 * Centered modal listing a filtered slice of the user's library — opened by
 * clicking a chart element (year bar, metacritic bucket, sentiment slice,
 * genre/tag orbit node, recency/playtime bucket, platform bar, shame pile).
 * Clicking a row bubbles up so the parent can navigate to the game detail page.
 */
@Component({
  selector: 'app-game-list-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-list-modal.component.html',
})
export class GameListModalComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() games: LibraryGame[] = [];
  @Input() total = 0;
  @Input() loading = false;
  @Output() closed = new EventEmitter<void>();
  @Output() gameSelected = new EventEmitter<number>();

  readonly searchQuery = signal('');

  get filteredGames(): LibraryGame[] {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.games;
    return this.games.filter((g) => g.name.toLowerCase().includes(q));
  }

  formatDate(value?: string): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('tr-TR');
  }
}
