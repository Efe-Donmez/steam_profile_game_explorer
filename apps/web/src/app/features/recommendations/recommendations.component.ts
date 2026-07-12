import { Component, DestroyRef, OnInit, computed, effect, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { SceneBackgroundComponent } from '../../shared/components/scene-background/scene-background.component';
import { FilterPanelComponent } from './components/filter-panel/filter-panel.component';
import { ResultCardComponent } from './components/result-card/result-card.component';
import { CompareModalComponent } from './components/compare-modal/compare-modal.component';
import { QuickViewDrawerComponent } from './components/quick-view-drawer/quick-view-drawer.component';
import { AiDialogBarComponent } from './components/ai-dialog-bar/ai-dialog-bar.component';
import { SearchBoxComponent } from '../../shared/components/search-box/search-box.component';
import { ModeService } from '../../core/services/mode.service';
import { RecommendationsService } from '../../core/services/recommendations.service';
import { FilterPresetsService, SavedFilterPreset } from '../../core/services/filter-presets.service';
import { ProfileService } from '../../core/services/profile.service';
import { defaultFilters, FacetOption, RankedGame, RecommendationSort } from '../../shared/models/recommendation.model';
import { currencySymbol } from '../../shared/utils/currency.util';

const SORT_OPTIONS: { label: string; value: RecommendationSort }[] = [
  { label: 'İlişkiye Göre', value: 'relevance' },
  { label: 'Puana Göre', value: 'score' },
  { label: 'Fiyata Göre (Artan)', value: 'price_asc' },
  { label: 'Fiyata Göre (Azalan)', value: 'price_desc' },
  { label: 'Çıkış Tarihine Göre (Yeni)', value: 'release_date' },
  { label: 'İndirim Oranına Göre', value: 'discount' },
];

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [
    RouterLink,
    SceneBackgroundComponent,
    FilterPanelComponent,
    ResultCardComponent,
    CompareModalComponent,
    QuickViewDrawerComponent,
    AiDialogBarComponent,
    SearchBoxComponent,
  ],
  templateUrl: './recommendations.component.html',
})
export class RecommendationsComponent implements OnInit {
  readonly filters = signal(defaultFilters());
  readonly genreFacets = signal<FacetOption[]>([]);
  readonly tagFacets = signal<FacetOption[]>([]);
  readonly facetTotal = signal(0);

  readonly results = signal<RankedGame[]>([]);
  readonly total = signal(0);
  readonly requestId = signal<string | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal(false);

  readonly page = signal(1);
  readonly pageSize = 12;
  // Previously the page/limit sent to recommend() were hardcoded to 1/12, so
  // `total()` (e.g. "347 SONUÇ") never matched what was actually fetchable —
  // there was no way to see anything past the first 12 results.
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  readonly sort = signal<RecommendationSort>('relevance');
  readonly sortOptions = SORT_OPTIONS;
  readonly view = signal<'grid' | 'list'>('grid');

  readonly compareMode = signal(false);
  readonly compareSelected = signal<Set<number>>(new Set());
  readonly savedGames = signal<Set<number>>(new Set());
  readonly quickViewGame = signal<RankedGame | null>(null);
  readonly showCompareTable = signal(false);
  readonly filterNote = signal('');

  readonly savedPresets = signal<SavedFilterPreset[]>([]);
  readonly topGenreChips = signal<{ name: string; pct: number }[]>([]);
  readonly currencySymbol = signal('$');
  private genreWeights: Record<string, number> = {};
  private initialized = false;

  readonly compareList = computed(() => this.results().filter((g) => this.compareSelected().has(g.appid)));

  constructor(
    readonly modeService: ModeService,
    private readonly recommendationsService: RecommendationsService,
    private readonly filterPresetsService: FilterPresetsService,
    private readonly profileService: ProfileService,
    private readonly destroyRef: DestroyRef,
  ) {
    effect(() => {
      // Re-run recommendations whenever the mode toggles (algo <-> AI).
      // effect() always fires once immediately at construction, before
      // ngOnInit's own load sequence runs — without the `initialized` guard,
      // that first firing kicked off a redundant default-filter recompute()
      // whose response (recompute() has no request-sequencing) could resolve
      // *after* ngOnInit's real one and silently overwrite it with stale data.
      this.modeService.mode();
      if (!this.initialized) return;
      void this.recomputeFromStart();
    });
  }

  async ngOnInit(): Promise<void> {
    toObservable(this.filters)
      .pipe(debounceTime(400), distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.refreshFacets());

    await Promise.all([this.loadPresets(), this.loadProfileContext()]);
    await this.refreshFacets();
    await this.recompute();
    this.initialized = true;
  }

  private async loadPresets(): Promise<void> {
    try {
      this.savedPresets.set(await this.filterPresetsService.findAll());
    } catch {
      // Presets are a convenience affordance; a failure here (401, transient
      // 5xx) must not stop refreshFacets()/recompute() from ever running,
      // which previously left the whole results grid empty with no results.
    }
  }

  private async loadProfileContext(): Promise<void> {
    try {
      const profile = await this.profileService.getProfile();
      this.genreWeights = profile.genreWeights;
      this.currencySymbol.set(currencySymbol(profile.currency));
      const total = Object.values(profile.genreWeights).reduce((sum, w) => sum + w, 0);
      this.topGenreChips.set(
        Object.entries(profile.genreWeights)
          .map(([name, w]) => ({ name, pct: total > 0 ? Math.round((w / total) * 100) : 0 }))
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 2),
      );
    } catch {
      // Profile may not exist yet; the screen still works without pinned genre chips.
    }
  }

  private async refreshFacets(): Promise<void> {
    try {
      const facets = await this.recommendationsService.getFacets(this.filters());
      this.genreFacets.set(facets.genres);
      this.tagFacets.set(facets.tags);
      this.facetTotal.set(facets.total);
    } catch {
      // A failure here (transient 5xx, network blip) previously threw an
      // unhandled rejection and left the genre/tag chip counts and "tahmini
      // X sonuç" figure silently frozen on stale data with no indication —
      // the facet panel just stopped reacting to filter changes.
    }
  }

  async recompute(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const res = await this.recommendationsService.recommend(
        this.filters(),
        this.modeService.mode(),
        this.sort(),
        this.page(),
        this.pageSize,
      );
      this.results.set(res.items);
      this.total.set(res.total);
      this.requestId.set(res.requestId);
    } catch {
      // Previously an unhandled rejection here (401, transient 5xx, network
      // blip) left `results`/`total` at their empty defaults with no
      // indication anything went wrong — the page just looked permanently
      // empty, which read as "the filters are broken" rather than "the
      // request failed". Surface it so the user can retry instead.
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  /** Use for anything that starts a new search (filters/sort/mode change) — stale pagination from the previous query wouldn't make sense against a new result set. */
  async recomputeFromStart(): Promise<void> {
    this.page.set(1);
    await this.recompute();
  }

  async goToPage(target: number): Promise<void> {
    const clamped = Math.min(Math.max(1, target), this.totalPages());
    if (clamped === this.page()) return;
    this.page.set(clamped);
    await this.recompute();
  }

  async nextPage(): Promise<void> {
    await this.goToPage(this.page() + 1);
  }

  async prevPage(): Promise<void> {
    await this.goToPage(this.page() - 1);
  }

  async onSortChange(event: Event): Promise<void> {
    const value = (event.target as HTMLSelectElement).value as RecommendationSort;
    this.sort.set(value);
    await this.recomputeFromStart();
  }

  setGridView(): void {
    this.view.set('grid');
  }

  setListView(): void {
    this.view.set('list');
  }

  toggleCompareMode(): void {
    this.compareMode.update((v) => !v);
  }

  toggleCompareGame(appid: number): void {
    this.compareSelected.update((set) => {
      const next = new Set(set);
      if (next.has(appid)) {
        next.delete(appid);
      } else if (next.size < 3) {
        next.add(appid);
      }
      return next;
    });
  }

  toggleSaveGame(appid: number): void {
    this.savedGames.update((set) => {
      const next = new Set(set);
      next.has(appid) ? next.delete(appid) : next.add(appid);
      return next;
    });
  }

  openQuickView(game: RankedGame): void {
    this.quickViewGame.set(game);
  }

  closeQuickView(): void {
    this.quickViewGame.set(null);
  }

  get quickViewGenrePercent(): number | null {
    const game = this.quickViewGame();
    if (!game || !game.genres[0]) return null;
    const total = Object.values(this.genreWeights).reduce((sum, w) => sum + w, 0);
    if (total === 0) return null;
    const weight = this.genreWeights[game.genres[0]] ?? 0;
    return Math.round((weight / total) * 100);
  }

  openCompareTable(): void {
    this.showCompareTable.set(true);
  }

  closeCompareTable(): void {
    this.showCompareTable.set(false);
  }

  async saveCurrentFilterPreset(): Promise<void> {
    const label = window.prompt('Bu filtre kombinasyonuna bir isim ver:');
    if (!label) return;
    const preset = await this.filterPresetsService.create(label, this.filters());
    this.savedPresets.update((list) => [preset, ...list]);
  }

  selectPreset(preset: SavedFilterPreset): void {
    this.filters.set(preset.filters);
  }

  async deletePreset(id: string): Promise<void> {
    await this.filterPresetsService.remove(id);
    this.savedPresets.update((list) => list.filter((p) => p._id !== id));
  }

  async submitAiRefinement(message: string): Promise<void> {
    const requestId = this.requestId();
    if (!requestId) return;
    this.loading.set(true);
    try {
      // The backend refine endpoint always recomputes from page 1.
      this.page.set(1);
      const res = await this.recommendationsService.refine(requestId, message);
      this.results.set(res.items);
      this.total.set(res.total);
      this.requestId.set(res.requestId);
      this.filterNote.set(res.filterNote);
    } finally {
      this.loading.set(false);
    }
  }
}
