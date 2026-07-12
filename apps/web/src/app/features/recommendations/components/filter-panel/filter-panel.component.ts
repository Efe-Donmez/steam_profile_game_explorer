import { Component, EventEmitter, Input, Output, model, signal } from '@angular/core';
import { CornerBracketsComponent } from '../../../../shared/components/corner-brackets/corner-brackets.component';
import { ModeService } from '../../../../core/services/mode.service';
import {
  FacetOption,
  Platform,
  Playstyle,
  RecommendationFilters,
  ReviewSentiment,
} from '../../../../shared/models/recommendation.model';
import { SavedFilterPreset } from '../../../../core/services/filter-presets.service';

const REVIEW_OPTIONS: { label: string; value: ReviewSentiment }[] = [
  { label: 'Fark Etmez', value: 'any' },
  { label: 'En Az Olumlu', value: 'positive' },
  { label: 'En Az Çok Olumlu', value: 'very_positive' },
  { label: 'Sadece Muhteşem', value: 'overwhelming' },
];

const PLATFORM_OPTIONS: { label: string; value: Platform }[] = [
  { label: 'Windows', value: 'windows' },
  { label: 'Mac', value: 'mac' },
  { label: 'Linux', value: 'linux' },
];

const PLAYSTYLE_OPTIONS: { label: string; value: Playstyle }[] = [
  { label: 'Tek Oyunculu', value: 'singleplayer' },
  { label: 'Çok Oyunculu', value: 'multiplayer' },
  { label: 'Co-op', value: 'coop' },
  { label: 'Kumanda Desteği', value: 'controller' },
  { label: 'Başarımlar Var', value: 'achievements' },
  { label: 'Bulut Kayıt', value: 'cloudSave' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_PRESETS = [
  { label: 'Son 1 Yıl', min: CURRENT_YEAR - 1, max: CURRENT_YEAR },
  { label: 'Son 5 Yıl', min: CURRENT_YEAR - 5, max: CURRENT_YEAR },
  { label: 'Tüm Zamanlar', min: 1990, max: CURRENT_YEAR },
];

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [CornerBracketsComponent],
  templateUrl: './filter-panel.component.html',
})
export class FilterPanelComponent {
  filters = model.required<RecommendationFilters>();

  @Input() genreFacets: FacetOption[] = [];
  @Input() tagFacets: FacetOption[] = [];
  @Input() resultCount = 0;
  @Input() currencySymbol = '$';
  @Input() savedPresets: SavedFilterPreset[] = [];

  @Output() recompute = new EventEmitter<void>();
  @Output() savePreset = new EventEmitter<void>();
  @Output() selectPreset = new EventEmitter<SavedFilterPreset>();
  @Output() deletePreset = new EventEmitter<string>();

  readonly activeTab = signal<'genres' | 'tags'>('genres');
  readonly tagSearch = signal('');

  readonly reviewOptions = REVIEW_OPTIONS;
  readonly platformOptions = PLATFORM_OPTIONS;
  readonly playstyleOptions = PLAYSTYLE_OPTIONS;
  readonly yearPresets = YEAR_PRESETS;

  constructor(readonly modeService: ModeService) {}

  get filteredTagFacets(): FacetOption[] {
    const q = this.tagSearch().toLowerCase();
    return this.tagFacets.filter((t) => t.name.toLowerCase().includes(q));
  }

  onSearchChange(value: string): void {
    this.filters.update((f) => ({ ...f, search: value }));
  }

  onPriceMaxChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.filters.update((f) => ({ ...f, priceMax: value * 100 }));
  }

  get priceMaxDisplay(): number {
    return Math.round(this.filters().priceMax / 100);
  }

  toggleDiscountOnly(): void {
    this.filters.update((f) => ({ ...f, onlyDiscounted: !f.onlyDiscounted }));
  }

  toggleShowFree(): void {
    this.filters.update((f) => ({ ...f, includeFree: !f.includeFree }));
  }

  toggleGenre(name: string): void {
    this.filters.update((f) => ({ ...f, genres: toggleInList(f.genres, name) }));
  }

  toggleTag(name: string): void {
    this.filters.update((f) => ({ ...f, tags: toggleInList(f.tags, name) }));
  }

  onScoreChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.filters.update((f) => ({ ...f, minMetacritic: value }));
  }

  selectReviewSentiment(value: ReviewSentiment): void {
    this.filters.update((f) => ({ ...f, reviewSentiment: value }));
  }

  togglePlatform(value: Platform): void {
    this.filters.update((f) => ({ ...f, platforms: toggleInList(f.platforms, value) }));
  }

  togglePlaystyle(value: Playstyle): void {
    this.filters.update((f) => ({ ...f, playstyle: toggleInList(f.playstyle, value) }));
  }

  selectYearPreset(min: number, max: number): void {
    this.filters.update((f) => ({ ...f, releaseYearMin: min, releaseYearMax: max }));
  }

  isYearPresetActive(min: number, max: number): boolean {
    const f = this.filters();
    return f.releaseYearMin === min && f.releaseYearMax === max;
  }

  resetFilters(): void {
    this.filters.update((f) => ({
      ...f,
      priceMin: 0,
      priceMax: 50000,
      onlyDiscounted: false,
      includeFree: true,
      genres: [],
      tags: [],
      minMetacritic: 0,
      reviewSentiment: 'any',
      platforms: [],
      playstyle: [],
      releaseYearMin: 1990,
      releaseYearMax: CURRENT_YEAR,
      search: '',
    }));
  }
}

function toggleInList<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
