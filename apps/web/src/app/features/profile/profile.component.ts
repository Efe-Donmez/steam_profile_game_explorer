import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  LibraryGame,
  LibraryQuery,
  ProfileService,
  TopGame,
  TopStudio,
  UserProfile,
  ValueLeagueEntry,
  ValueMapPoint,
  WeeklyTrend,
} from '../../core/services/profile.service';
import { GameListModalComponent } from './components/game-list-modal/game-list-modal.component';
import { currencySymbol } from '../../shared/utils/currency.util';
import { AuthService } from '../../core/services/auth.service';
import { GameDetailModalService } from '../../core/services/game-detail-modal.service';
import { SceneBackgroundComponent } from '../../shared/components/scene-background/scene-background.component';
import { CornerBracketsComponent } from '../../shared/components/corner-brackets/corner-brackets.component';
import { GenreOrbitChartComponent, GenreOrbitItem } from '../../shared/components/genre-orbit-chart/genre-orbit-chart.component';
import { ScatterChartComponent, ScatterPoint } from '../../shared/components/scatter-chart/scatter-chart.component';
import { HistogramChartComponent, HistogramBucket } from '../../shared/components/histogram-chart/histogram-chart.component';
import { DonutChartComponent, DonutBucket } from '../../shared/components/donut-chart/donut-chart.component';
import { TimelineChartComponent, TimelineEntry } from '../../shared/components/timeline-chart/timeline-chart.component';
import { SpiderChartComponent, SpiderAxis } from '../../shared/components/spider-chart/spider-chart.component';
import { GaugeChartComponent } from '../../shared/components/gauge-chart/gauge-chart.component';
import { WeeklyTrendChartComponent } from '../../shared/components/weekly-trend-chart/weekly-trend-chart.component';
import { SearchBoxComponent } from '../../shared/components/search-box/search-box.component';
import { CountUpDirective } from '../../shared/directives/count-up.directive';

const METACRITIC_BUCKET_ORDER = ['0-49', '50-59', '60-69', '70-79', '80-89', '90-100', 'unrated'];

export interface KpiEntry {
  value: number;
  prefix: string;
  suffix: string;
  label: string;
  footnote?: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    RouterLink,
    SceneBackgroundComponent,
    CornerBracketsComponent,
    GenreOrbitChartComponent,
    ScatterChartComponent,
    HistogramChartComponent,
    DonutChartComponent,
    TimelineChartComponent,
    SpiderChartComponent,
    GaugeChartComponent,
    WeeklyTrendChartComponent,
    SearchBoxComponent,
    CountUpDirective,
    GameListModalComponent,
  ],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  readonly loading = signal(true);
  readonly orbitMode = signal<'genre' | 'tag'>('genre');
  protected readonly String = String;

  profile?: UserProfile;
  topGames: TopGame[] = [];
  topStudios: TopStudio[] = [];
  valueMap: ValueMapPoint[] = [];
  weeklyTrend?: WeeklyTrend;

  constructor(
    private readonly profileService: ProfileService,
    protected readonly authService: AuthService,
    private readonly router: Router,
    private readonly gameDetailModalService: GameDetailModalService,
  ) {}

  async ngOnInit(): Promise<void> {
    if (!this.authService.user()) {
      void this.authService.fetchMe();
    }
    try {
      const [profile, topGamesRes, topStudiosRes, valueMap, weeklyTrend] = await Promise.all([
        this.profileService.getProfile(),
        this.profileService.getTopGames(15),
        this.profileService.getTopStudios(5),
        this.profileService.getValueMap(),
        this.profileService.getWeeklyTrend(),
      ]);
      this.profile = profile;
      this.topGames = topGamesRes.items;
      this.topStudios = topStudiosRes.items;
      this.valueMap = valueMap;
      this.weeklyTrend = weeklyTrend;
    } catch {
      // An unhandled rejection here (401, no profile yet, transient 5xx)
      // previously left `loading` stuck at true forever with no feedback.
      void this.router.navigate(['/empty'], { queryParams: { state: 'empty' } });
      return;
    } finally {
      this.loading.set(false);
    }
  }

  setOrbitMode(mode: 'genre' | 'tag'): void {
    this.orbitMode.set(mode);
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

  get orbitItems(): GenreOrbitItem[] {
    return this.orbitMode() === 'genre'
      ? this.weightBreakdown(this.profile?.genreWeights, 8)
      : this.weightBreakdown(this.profile?.tagWeights, 10);
  }

  get genreBreakdown(): GenreOrbitItem[] {
    return this.weightBreakdown(this.profile?.genreWeights, 8);
  }

  get hasTagData(): boolean {
    return Object.keys(this.profile?.tagWeights ?? {}).length > 0;
  }

  get topTwoGenres(): string {
    return this.genreBreakdown
      .slice(0, 2)
      .map((g) => g.name)
      .join(' ve ');
  }

  /** Display symbol for the library's dominant price currency (Steam TR = USD since 2024). */
  get currencySymbol(): string {
    return currencySymbol(this.profile?.currency);
  }

  get kpis(): KpiEntry[] {
    const p = this.profile;
    if (!p) return [];
    const cur = this.currencySymbol;
    return [
      { value: p.totalGames, prefix: '', suffix: '', label: 'TOPLAM OYUN' },
      { value: Math.round(p.totalPlaytimeMinutes / 60), prefix: '', suffix: ' SA', label: 'TOPLAM OYNAMA SÜRESİ' },
      { value: Math.round(p.totalEstimatedSpendCents / 100), prefix: cur, suffix: '*', label: 'TAHMİNİ TOPLAM HARCAMA', footnote: true },
      { value: Math.round(p.libraryValueCents / 100), prefix: cur, suffix: '', label: 'KÜTÜPHANENİN GÜNCEL DEĞERİ' },
      { value: p.avgReviewScorePreference, prefix: '%', suffix: '', label: 'ORT. POZİTİF YORUM ORANI' },
      { value: p.avgMetacriticPreference, prefix: '', suffix: '', label: 'ORT. METACRITIC PUANI' },
      { value: p.avgAchievementCompletion, prefix: '%', suffix: '', label: 'ORT. BAŞARIM TAMAMLAMA' },
      { value: p.neverPlayedCount, prefix: '', suffix: '', label: 'HİÇ OYNANMAMIŞ OYUN' },
    ];
  }

  get catalogCoveragePct(): number {
    const c = this.profile?.coverage?.catalog;
    if (!c || c.total === 0) return 100;
    return Math.round((c.fetched / c.total) * 100);
  }

  get showCoverageBanner(): boolean {
    return this.catalogCoveragePct < 95;
  }

  get mostPlayed(): (TopGame & { rank: number; pct: number })[] {
    const maxHours = Math.max(1, ...this.topGames.map((g) => g.hours));
    return this.topGames.map((g, i) => ({ ...g, rank: i + 1, pct: Math.round((g.hours / maxHours) * 100) }));
  }

  get heroBackdrop(): string | undefined {
    return this.topGames[0]?.headerImage;
  }

  get scatterPoints(): ScatterPoint[] {
    return this.valueMap.map((v) => ({
      price: Math.round(v.priceCents / 100),
      hours: v.hours,
      name: v.name,
      isFree: v.isFree,
      appid: v.appid,
    }));
  }

  get metacriticBuckets(): HistogramBucket[] {
    const histogram = this.profile?.metacriticHistogram ?? {};
    return METACRITIC_BUCKET_ORDER.map((key) => ({
      label: key === 'unrated' ? '—' : key,
      count: histogram[key] ?? 0,
    }));
  }

  get reviewDonutBuckets(): DonutBucket[] {
    const b = this.profile?.reviewSentimentBuckets;
    return [
      { label: 'Harika (%90+)', count: b?.excellent ?? 0, color: '#4CF3FF' },
      { label: 'Olumlu (%70-89)', count: b?.positive ?? 0, color: '#8B7CF6' },
      { label: 'Karışık (%40-69)', count: b?.mixed ?? 0, color: '#FFB84D' },
      { label: 'Olumsuz (<%40)', count: b?.negative ?? 0, color: '#FF4D6D' },
    ];
  }

  get timelineEntries(): TimelineEntry[] {
    const histogram = this.profile?.releaseYearHistogram ?? {};
    return Object.entries(histogram)
      .map(([year, count]) => ({ year: parseInt(year, 10), count }))
      .sort((a, b) => a.year - b.year);
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

  /** Backend nicheScore is 0=mainstream..100=niche; the gauge visual is 0=niche(left)..100=mainstream(right). */
  get gaugeValue(): number {
    return 100 - (this.profile?.nicheScore ?? 50);
  }

  get weeklyTrendWeeks(): { weekStart: string; minutes: number }[] {
    return this.weeklyTrend?.weeks ?? [];
  }

  get hasWeeklyTrendData(): boolean {
    return this.weeklyTrend?.hasEnoughData ?? false;
  }

  get thisWeekMinutes(): number {
    const weeks = this.weeklyTrendWeeks;
    return weeks[weeks.length - 1]?.minutes ?? 0;
  }

  get lastWeekMinutes(): number {
    const weeks = this.weeklyTrendWeeks;
    return weeks[weeks.length - 2]?.minutes ?? 0;
  }

  /** Percentage change vs. the prior week; `null` when the prior week has no signal to compare against. */
  get weeklyTrendDeltaPct(): number | null {
    if (this.lastWeekMinutes === 0) return null;
    return Math.round(((this.thisWeekMinutes - this.lastWeekMinutes) / this.lastWeekMinutes) * 100);
  }

  get shamePilePct(): number {
    const p = this.profile;
    if (!p || p.totalGames === 0) return 0;
    return Math.round((p.neverPlayedCount / p.totalGames) * 100);
  }

  get bestValue(): ValueLeagueEntry[] {
    return this.profile?.bestValueGames ?? [];
  }

  get worstValue(): ValueLeagueEntry[] {
    return this.profile?.worstValueGames ?? [];
  }

  get platformBars(): { name: string; pct: number; color: string }[] {
    const p = this.profile?.platformCoverage;
    return [
      { name: 'Windows', pct: p?.windows ?? 0, color: '#4CF3FF' },
      { name: 'macOS', pct: p?.mac ?? 0, color: '#8B7CF6' },
      { name: 'Linux', pct: p?.linux ?? 0, color: '#FFB84D' },
    ];
  }

  formatHours(minutes: number): string {
    return Math.round(minutes / 60).toLocaleString('tr-TR');
  }

  formatMinutesLong(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours > 0 ? `${hours} sa ${rest} dk` : `${rest} dk`;
  }

  formatCurrency(cents: number): string {
    return Math.round(cents / 100).toLocaleString('tr-TR');
  }

  formatCostPerHour(centsPerHour: number): string {
    return (centsPerHour / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatDate(value?: string | Date): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('tr-TR');
  }

  // --- Interactivity: game detail page navigation + filtered library modal ---

  readonly modalOpen = signal(false);
  readonly modalTitle = signal('');
  readonly modalSubtitle = signal('');
  readonly modalGames = signal<LibraryGame[]>([]);
  readonly modalTotal = signal(0);
  readonly modalLoading = signal(false);

  goToGame(appid: number): void {
    this.gameDetailModalService.open(appid);
  }

  async openLibraryModal(title: string, subtitle: string, query: LibraryQuery): Promise<void> {
    this.modalOpen.set(true);
    this.modalTitle.set(title);
    this.modalSubtitle.set(subtitle);
    this.modalLoading.set(true);
    this.modalGames.set([]);
    try {
      const res = await this.profileService.getLibrary(query);
      this.modalGames.set(res.items);
      this.modalTotal.set(res.total);
    } finally {
      this.modalLoading.set(false);
    }
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  onModalGameSelected(appid: number): void {
    this.goToGame(appid);
  }

  // --- Chart click handlers ---

  onTimelineYearClick(year: number): void {
    void this.openLibraryModal(`${year} çıkışlı oyunların`, 'Kütüphanendeki bu yıla ait oyunlar', { year });
  }

  onMetacriticBucketClick(label: string): void {
    const bucket = label === '—' ? 'unrated' : label;
    const title = bucket === 'unrated' ? 'Metacritic puanı olmayanlar' : `Metacritic ${bucket} aralığı`;
    void this.openLibraryModal(title, 'Kütüphanendeki bu puan aralığındaki oyunlar', { metacriticBucket: bucket });
  }

  onSentimentClick(label: string): void {
    const map: Record<string, string> = {
      'Harika (%90+)': 'excellent',
      'Olumlu (%70-89)': 'positive',
      'Karışık (%40-69)': 'mixed',
      'Olumsuz (<%40)': 'negative',
    };
    const sentiment = map[label];
    if (!sentiment) return;
    void this.openLibraryModal(label + ' yorumlu oyunların', 'Steam topluluk yorumu profiline göre', { sentiment });
  }

  onOrbitNodeClick(name: string): void {
    const isGenre = this.orbitMode() === 'genre';
    void this.openLibraryModal(
      `${name} oyunların`,
      isGenre ? 'Bu türdeki tüm kütüphane oyunların' : 'Bu tag\'e sahip tüm kütüphane oyunların (SteamSpy)',
      isGenre ? { genre: name } : { tag: name },
    );
  }

  onScatterPointClick(appid: number): void {
    this.goToGame(appid);
  }

  onGenreRowClick(name: string): void {
    void this.openLibraryModal(`${name} oyunların`, 'Bu türdeki tüm kütüphane oyunların', { genre: name });
  }

  openNeverPlayed(): void {
    void this.openLibraryModal('Utanç Yığını', 'Hiç açılmamış oyunların', { neverPlayed: true, sort: 'price' });
  }

  openPlatform(platform: string, label: string): void {
    void this.openLibraryModal(`${label} destekleyen oyunların`, '', { platform });
  }

  openRecency(bucket: string, label: string): void {
    void this.openLibraryModal(label, 'Son oynama tarihine göre', { recency: bucket, sort: 'lastPlayed' });
  }

  openPlaytimeBucket(bucket: string, label: string): void {
    void this.openLibraryModal(label, 'Toplam oynama süresine göre', { playtimeBucket: bucket });
  }

  openPerfectGames(): void {
    void this.openLibraryModal('%100 tamamlananlar', 'Tüm başarımları açtığın oyunlar', { sort: 'completion' });
  }

  // --- Competitor-inspired panels (SteamDB playtime distribution, recency) ---

  get playtimeDistBars(): { key: string; label: string; count: number; pct: number }[] {
    const b = this.profile?.playtimeBuckets;
    if (!b) return [];
    const entries = [
      { key: 'never', label: 'Hiç', count: b.never },
      { key: 'under1h', label: '<1 sa', count: b.under1h },
      { key: 'h1to5', label: '1-5 sa', count: b.h1to5 },
      { key: 'h5to20', label: '5-20 sa', count: b.h5to20 },
      { key: 'h20to100', label: '20-100 sa', count: b.h20to100 },
      { key: 'over100h', label: '100+ sa', count: b.over100h },
    ];
    const max = Math.max(1, ...entries.map((e) => e.count));
    return entries.map((e) => ({ ...e, pct: Math.round((e.count / max) * 100) }));
  }

  get recencyBars(): { key: string; label: string; count: number; pct: number }[] {
    const b = this.profile?.recencyBuckets;
    if (!b) return [];
    const entries = [
      { key: 'last2Weeks', label: 'Son 2 hafta', count: b.last2Weeks },
      { key: 'lastMonth', label: 'Son 1 ay', count: b.lastMonth },
      { key: 'last6Months', label: 'Son 6 ay', count: b.last6Months },
      { key: 'lastYear', label: 'Son 1 yıl', count: b.lastYear },
      { key: 'older', label: '1+ yıl önce', count: b.older },
      { key: 'unknown', label: 'Tarih yok', count: b.unknown },
    ];
    const max = Math.max(1, ...entries.map((e) => e.count));
    return entries.map((e) => ({ ...e, pct: Math.round((e.count / max) * 100) }));
  }

  steamStoreUrl(appid: number): string {
    return `https://store.steampowered.com/app/${appid}`;
  }
}
