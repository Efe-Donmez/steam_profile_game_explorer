import { Component, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SceneBackgroundComponent } from '../../shared/components/scene-background/scene-background.component';
import { CornerBracketsComponent } from '../../shared/components/corner-brackets/corner-brackets.component';
import { OrbitChartComponent } from '../../shared/components/orbit-chart/orbit-chart.component';
import { environment } from '../../../environments/environment';

type EmptyView = 'private' | 'empty';

interface PrivateStep {
  n: string;
  text: string;
}

@Component({
  selector: 'app-empty-states',
  standalone: true,
  imports: [SceneBackgroundComponent, CornerBracketsComponent, OrbitChartComponent],
  templateUrl: './empty-states.component.html',
})
export class EmptyStatesComponent {
  readonly isDev = !environment.production;
  readonly view = signal<EmptyView>('private');

  readonly privateSteps: PrivateStep[] = [
    { n: '1', text: 'Steam profilini aç' },
    { n: '2', text: 'Gizlilik ayarlarına git' },
    { n: '3', text: "Oyun Detayları'nı herkese açık yap" },
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    const initial = this.route.snapshot.queryParamMap.get('state');
    this.view.set(initial === 'empty' ? 'empty' : 'private');
  }

  showPrivate(): void {
    this.view.set('private');
  }

  showEmpty(): void {
    this.view.set('empty');
  }

  retryPrivateCheck(): void {
    window.location.reload();
  }

  resetFilters(): void {
    void this.router.navigate(['/app']);
  }
}
