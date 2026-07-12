import { Component, signal } from '@angular/core';
import { SearchResult, SearchService } from '../../../core/services/search.service';
import { GameDetailModalService } from '../../../core/services/game-detail-modal.service';

let debounceHandle: ReturnType<typeof setTimeout> | undefined;

/**
 * Shared top-bar search: looks up games by name across the user's own
 * library and the wider catalog cache, then opens the game detail modal.
 * Used on every authenticated page's navbar.
 */
@Component({
  selector: 'app-search-box',
  standalone: true,
  template: `
    <div class="relative">
      <input
        type="text"
        placeholder="Oyun ara..."
        [value]="query()"
        (input)="onInput($any($event.target).value)"
        (focus)="onFocus()"
        (blur)="onBlur()"
        class="bg-void-ink border border-panel-line rounded-md px-3 py-2 text-ghost-white text-[13px] font-body w-[220px] focus:outline-none focus:border-ion-cyan"
      />
      @if (open() && (results().length > 0 || loading())) {
        <div class="absolute top-[calc(100%+6px)] right-0 w-[320px] max-h-[360px] overflow-y-auto bg-deep-slate border border-panel-line rounded-lg shadow-lg z-[100] py-1.5">
          @if (loading()) {
            <div class="px-3 py-2.5 font-mono text-[11px] text-slate-mute">Aranıyor...</div>
          } @else {
            @for (r of results(); track r.appid) {
              <div class="row-clickable grid grid-cols-[48px_1fr_auto] items-center gap-2.5 mx-1.5 px-2 py-1.5" (mousedown)="selectResult(r.appid)">
                @if (r.capsuleImage || r.headerImage) {
                  <img
                    [src]="r.capsuleImage || r.headerImage"
                    [alt]="r.name"
                    loading="lazy"
                    class="w-[48px] h-[22px] object-cover rounded border border-panel-line"
                  />
                } @else {
                  <div class="w-[48px] h-[22px] rounded bg-panel-line"></div>
                }
                <span class="text-[12px] truncate">{{ r.name }}</span>
                @if (r.owned) {
                  <span class="font-mono text-[9px] text-ion-cyan border border-ion-cyan/40 rounded-full px-1.5 py-0.5">SAHİP</span>
                }
              </div>
            }
          }
        </div>
      }
    </div>
  `,
})
export class SearchBoxComponent {
  readonly query = signal('');
  readonly results = signal<SearchResult[]>([]);
  readonly loading = signal(false);
  readonly open = signal(false);

  constructor(
    private readonly searchService: SearchService,
    private readonly gameDetailModalService: GameDetailModalService,
  ) {}

  onInput(value: string): void {
    this.query.set(value);
    this.open.set(true);
    if (debounceHandle) clearTimeout(debounceHandle);
    const q = value.trim();
    if (!q) {
      this.results.set([]);
      return;
    }
    this.loading.set(true);
    debounceHandle = setTimeout(() => void this.runSearch(q), 300);
  }

  private async runSearch(q: string): Promise<void> {
    try {
      this.results.set(await this.searchService.search(q));
    } finally {
      this.loading.set(false);
    }
  }

  onFocus(): void {
    if (this.query().trim()) this.open.set(true);
  }

  onBlur(): void {
    // Delay so a click on a dropdown row (mousedown) registers before the input's blur closes it.
    setTimeout(() => this.open.set(false), 150);
  }

  selectResult(appid: number): void {
    this.open.set(false);
    this.query.set('');
    this.results.set([]);
    this.gameDetailModalService.open(appid);
  }
}
