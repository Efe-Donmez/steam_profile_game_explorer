import { Component } from '@angular/core';
import { OrbitChartComponent } from '../../shared/components/orbit-chart/orbit-chart.component';
import { CornerBracketsComponent } from '../../shared/components/corner-brackets/corner-brackets.component';
import { SceneBackgroundComponent } from '../../shared/components/scene-background/scene-background.component';
import { OrbitPoint } from '../../shared/models/orbit-point.model';
import { AuthService } from '../../core/services/auth.service';

interface LandingStep {
  num: string;
  text: string;
  icon: 'scan' | 'orbit' | 'compass';
}

interface GenreChip {
  name: string;
  active: boolean;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [OrbitChartComponent, CornerBracketsComponent, SceneBackgroundComponent],
  templateUrl: './landing.component.html',
})
export class LandingComponent {
  constructor(private readonly auth: AuthService) {}

  readonly heroPoints: OrbitPoint[] = [
    { name: 'RPG', angle: -90, distance: 120 },
    { name: 'Strateji', angle: -45, distance: 95 },
    { name: 'FPS', angle: 0, distance: 140 },
    { name: 'Rogue-like', angle: 45, distance: 110 },
    { name: 'Simülasyon', angle: 90, distance: 150 },
    { name: 'Macera', angle: 135, distance: 100 },
    { name: 'Puzzle', angle: 180, distance: 135 },
    { name: 'Aksiyon', angle: -135, distance: 115 },
  ];

  readonly miniPoints: OrbitPoint[] = this.heroPoints
    .slice(0, 5)
    .map((p) => ({ ...p, distance: p.distance * 0.55 }));

  readonly steps: LandingStep[] = [
    { num: '01 TARA', text: 'Steam kütüphaneni ve oynama sürelerini okuyoruz.', icon: 'scan' },
    { num: '02 ANALİZ ET', text: 'Hangi türde ne kadar zaman geçirdiğini bir profile dönüştürüyoruz.', icon: 'orbit' },
    { num: '03 YÖNLEN', text: 'Bütçeni ve tercihlerini seç, sana özel öneriler gelsin.', icon: 'compass' },
  ];

  readonly genreChips: GenreChip[] = [
    { name: 'RPG', active: true },
    { name: 'Strateji', active: true },
    { name: 'FPS', active: false },
    { name: 'Rogue-like', active: false },
    { name: 'Simülasyon', active: false },
  ];

  loginWithSteam(): void {
    this.auth.loginWithSteam();
  }
}
