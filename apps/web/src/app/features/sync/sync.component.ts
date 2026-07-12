import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { OrbitChartComponent } from '../../shared/components/orbit-chart/orbit-chart.component';
import { SceneBackgroundComponent } from '../../shared/components/scene-background/scene-background.component';
import { OrbitPoint } from '../../shared/models/orbit-point.model';
import { AuthService } from '../../core/services/auth.service';
import { SyncService } from '../../core/services/sync.service';

const STATUS_MESSAGES = [
  'KÜTÜPHANE OKUNUYOR...',
  '184 OYUN BULUNDU',
  'TÜR VERİLERİ EŞLEŞTİRİLİYOR...',
  'ZEVK PROFİLİ HESAPLANIYOR...',
];

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 40;

@Component({
  selector: 'app-sync',
  standalone: true,
  imports: [OrbitChartComponent, SceneBackgroundComponent],
  templateUrl: './sync.component.html',
  styleUrl: './sync.component.css',
})
export class SyncComponent implements OnInit, OnDestroy {
  readonly points: OrbitPoint[] = [
    { name: 'RPG', angle: -90, distance: 90 },
    { name: 'Strateji', angle: -30, distance: 70 },
    { name: 'FPS', angle: 30, distance: 100 },
    { name: 'Rogue-like', angle: 90, distance: 80 },
    { name: 'Simülasyon', angle: 150, distance: 95 },
    { name: 'Macera', angle: -150, distance: 75 },
  ];

  readonly statusIndex = signal(0);
  readonly currentStatus = () => STATUS_MESSAGES[this.statusIndex()];

  private statusMessageSub?: Subscription;
  private pollSub?: Subscription;
  private pollAttempts = 0;

  constructor(
    private readonly auth: AuthService,
    private readonly syncService: SyncService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.statusMessageSub = interval(2200).subscribe(() => {
      this.statusIndex.update((i) => (i + 1) % STATUS_MESSAGES.length);
    });

    void this.auth.fetchMe().then((user) => {
      // fetchMe() swallows request errors and resolves null; the route guard
      // already keeps a logged-out user from reaching this screen, but if the
      // session expires mid-poll (or this resolves null for any other
      // reason) don't fall through into polling a session that isn't there.
      if (!user) {
        void this.router.navigate(['/']);
        return;
      }
      if (user.isPrivate) {
        void this.router.navigate(['/empty'], { queryParams: { state: 'private' } });
        return;
      }
      this.pollSub = interval(POLL_INTERVAL_MS).subscribe(() => void this.pollSyncStatus());
      void this.pollSyncStatus();
    });
  }

  private async pollSyncStatus(): Promise<void> {
    this.pollAttempts += 1;
    try {
      const { status } = await this.syncService.getStatus();
      if (status === 'completed') {
        this.pollSub?.unsubscribe();
        void this.router.navigate(['/profile']);
        return;
      }
      if (status === 'failed' || this.pollAttempts >= MAX_POLL_ATTEMPTS) {
        // A failed or stalled sync means there's no reliable profile to show
        // yet — routing to /profile here previously made a failure look
        // identical to success, dropping the user onto an all-zero dashboard
        // with no explanation.
        this.pollSub?.unsubscribe();
        void this.router.navigate(['/empty'], { queryParams: { state: 'empty' } });
      }
    } catch {
      // A transient request error (network blip, expired session) must not
      // be allowed to throw out of this handler: since it happened before
      // reaching the stop condition below, the interval would otherwise keep
      // firing — and rejecting — every 3s forever, past MAX_POLL_ATTEMPTS.
      this.pollSub?.unsubscribe();
      void this.router.navigate(['/empty'], { queryParams: { state: 'empty' } });
    }
  }

  ngOnDestroy(): void {
    this.statusMessageSub?.unsubscribe();
    this.pollSub?.unsubscribe();
  }
}
