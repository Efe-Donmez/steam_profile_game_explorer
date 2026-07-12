import { Component, DestroyRef, OnInit, computed, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Friend, FriendsService } from '../../core/services/friends.service';
import { TopGame, UserProfile } from '../../core/services/profile.service';
import { ModeService } from '../../core/services/mode.service';
import { SceneBackgroundComponent } from '../../shared/components/scene-background/scene-background.component';
import { CornerBracketsComponent } from '../../shared/components/corner-brackets/corner-brackets.component';
import { GenreOrbitChartComponent, GenreOrbitItem } from '../../shared/components/genre-orbit-chart/genre-orbit-chart.component';
import { SpiderChartComponent, SpiderAxis } from '../../shared/components/spider-chart/spider-chart.component';
import { GaugeChartComponent } from '../../shared/components/gauge-chart/gauge-chart.component';
import { CountUpDirective } from '../../shared/directives/count-up.directive';
import { ResultCardComponent } from '../recommendations/components/result-card/result-card.component';
import { FilterPanelComponent } from '../recommendations/components/filter-panel/filter-panel.component';
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
  selector: 'app-friend-detail',
  standalone: true,
  imports: [
    RouterLink,
    SceneBackgroundComponent,
    CornerBracketsComponent,
    GenreOrbitChartComponent,
    SpiderChartComponent,
    GaugeChartComponent,
    CountUpDirective,
    ResultCardComponent,
    FilterPanelComponent,
  ],
  templateUrl: './friend-detail.component.html',
})
export class FriendDetailComponent implements OnInit {
  readonly loading = signal(true);
  readonly notAllowed = signal(false);

  /** Identifies the friend: their internal userId (joined SteamCompass) or Steam steamId (guest, never joined). */
  private identifier!: string;
  isGuest = false;
  friendMeta?: Friend;
  profile?: UserProfile;
  topGames: TopGame[] = [];

  readonly filters = signal(defaultFilters());
  readonly genreFacets = signal<FacetOption[]>([]);
  readonly tagFacets = signal<FacetOption[]>([]);
  readonly facetTotal = signal(0);

  readonly results = signal<RankedGame[]>([]);
  readonly total = signal(0);
  readonly resultsLoading = signal(false);
  readonly page = signal(1);
  readonly pageSize = 12;
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));
  readonly sort = signal<RecommendationSort>('relevance');
  readonly sortOptions = SORT_OPTIONS;
  readonly currencySymbol = signal('$');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly friendsService: FriendsService,
    readonly modeService: ModeService,
    private readonly destroyRef: DestroyRef,
  ) {}

  async ngOnInit(): Promise<void> {
    const friendUserId = this.route.snapshot.paramMap.get('friendUserId');
    const guestSteamId = this.route.snapshot.paramMap.get('steamId');
    this.isGuest = guestSteamId !== null;
    this.identifier = (friendUserId ?? guestSteamId)!;

    toObservable(this.filters)
      .pipe(
        debounceTime(400),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => void this.refreshFacetsAndRecompute());

    try {
      const [friends, profile, topGamesRes] = await Promise.all([
        this.friendsService.getFriends(),
        this.isGuest
          ? this.friendsService.getGuestProfile(this.identifier)
          : this.friendsService.getFriendProfile(this.identifier),
        this.isGuest
          ? this.friendsService.getGuestTopGames(this.identifier, 10)
          : this.friendsService.getFriendTopGames(this.identifier, 10),
      ]);
      this.friendMeta = this.isGuest
        ? friends.find((f) => f.steamId === this.identifier)
        : friends.find((f) => f.friendUserId === this.identifier);
      this.profile = profile;
      this.topGames = topGamesRes.items;
      this.currencySymbol.set(currencySymbol(profile.currency));
      await this.refreshFacets();
      await this.recompute();
    } catch (err) {
      if ((err as { status?: number }).status === 403 || (err as { status?: number }).status === 404) {
        this.notAllowed.set(true);
      } else {
        void this.router.navigate(['/friends']);
        return;
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async refreshFacets(): Promise<void> {
    const facets = this.isGuest
      ? await this.friendsService.getGuestFacets(this.identifier, this.filters())
      : await this.friendsService.getFriendFacets(this.identifier, this.filters());
    this.genreFacets.set(facets.genres);
    this.tagFacets.set(facets.tags);
    this.facetTotal.set(facets.total);
  }

  private async refreshFacetsAndRecompute(): Promise<void> {
    await this.refreshFacets();
    await this.recomputeFromStart();
  }

  async recompute(): Promise<void> {
    this.resultsLoading.set(true);
    try {
      const res = this.isGuest
        ? await this.friendsService.getGuestRecommendations(
            this.identifier,
            this.filters(),
            this.modeService.mode(),
            this.sort(),
            this.page(),
            this.pageSize,
          )
        : await this.friendsService.getFriendRecommendations(
            this.identifier,
            this.filters(),
            this.modeService.mode(),
            this.sort(),
            this.page(),
            this.pageSize,
          );
      this.results.set(res.items);
      this.total.set(res.total);
    } finally {
      this.resultsLoading.set(false);
    }
  }

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

  async onSortChange(event: Event): Promise<void> {
    this.sort.set((event.target as HTMLSelectElement).value as RecommendationSort);
    await this.recomputeFromStart();
  }

  async onModeToggle(): Promise<void> {
    this.modeService.isAi() ? this.modeService.setAlgorithmic() : this.modeService.setAiAssisted();
    await this.recomputeFromStart();
  }

  private weightBreakdown(weights: Record<string, number> | undefined, limit: number): GenreOrbitItem[] {
    if (!weights) return [];
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    if (total === 0) return [];
    return Object.entries(weights)
      .map(([name, w]) => ({ name, pct: Math.round((w / total) * 100) }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, limit);
  }

  get genreBreakdown(): GenreOrbitItem[] {
    return this.weightBreakdown(this.profile?.genreWeights, 8);
  }

  get spiderAxes(): SpiderAxis[] {
    const f = this.profile?.featureCoverage;
    return [
      { name: 'Çok Oyunculu', pct: f?.multiplayer ?? 0 },
      { name: 'Co-op', pct: f?.coop ?? 0 },
      { name: 'Başarımlar', pct: f?.achievements ?? 0 },
      { name: 'Bulut Kayıt', pct: f?.cloudSave ?? 0 },
      { name: 'Kumanda', pct: f?.controller ?? 0 },
      { name: 'Tek Oyunculu', pct: f?.singleplayer ?? 0 },
    ];
  }

  get gaugeValue(): number {
    return 100 - (this.profile?.nicheScore ?? 50);
  }

  get totalHours(): number {
    return Math.round((this.profile?.totalPlaytimeMinutes ?? 0) / 60);
  }

  formatHours(minutes: number): string {
    return Math.round(minutes / 60).toLocaleString('tr-TR');
  }

  formatCurrency(cents: number): string {
    return Math.round(cents / 100).toLocaleString('tr-TR');
  }

  steamStoreUrl(appid: number): string {
    return `https://store.steampowered.com/app/${appid}`;
  }

  openGameInStore(game: RankedGame): void {
    window.open(this.steamStoreUrl(game.appid), '_blank', 'noopener');
  }
}
