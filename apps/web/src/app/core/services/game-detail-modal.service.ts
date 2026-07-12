import { Injectable, signal } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Drives the global game detail modal (mounted once at the app root) so any
 * component — profile page rows, quick-view drawer, search results — can
 * open it for a given appid without routing to a dedicated page.
 */
@Injectable({ providedIn: 'root' })
export class GameDetailModalService {
  readonly openAppid = signal<number | null>(null);

  constructor(router: Router) {
    // Closes the modal if a link inside it (or anything else) navigates away,
    // so it doesn't stay stuck open floating over an unrelated page.
    router.events.pipe(filter((e) => e instanceof NavigationStart)).subscribe(() => this.close());
  }

  open(appid: number): void {
    this.openAppid.set(appid);
  }

  close(): void {
    this.openAppid.set(null);
  }
}
