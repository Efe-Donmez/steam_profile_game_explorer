import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface WeeklyTrendPoint {
  weekStart: string;
  minutes: number;
}

@Component({
  selector: 'app-weekly-trend-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg width="100%" height="170" [attr.viewBox]="'0 0 ' + w + ' 170'">
      @for (p of weeks; track p.weekStart; let i = $index) {
        <rect
          class="anim-svg-bar"
          [style.animation-delay.ms]="i * 60"
          [attr.x]="barX(i)"
          [attr.y]="140 - barHeight(p.minutes)"
          [attr.width]="barW"
          [attr.height]="barHeight(p.minutes)"
          [attr.fill]="i === weeks.length - 1 ? '#FFB84D' : '#4CF3FF'"
          [attr.opacity]="p.minutes === 0 ? 0.25 : 0.85"
          rx="2"
        >
          <title>{{ weekLabel(p.weekStart) }}: {{ hoursLabel(p.minutes) }}</title>
        </rect>
        <text [attr.x]="barX(i) + barW / 2" y="156" text-anchor="middle" fill="#7C8AA0" style="font-family:'IBM Plex Mono',monospace; font-size:9px;">
          {{ weekLabel(p.weekStart) }}
        </text>
      }
    </svg>
  `,
})
export class WeeklyTrendChartComponent {
  @Input() weeks: WeeklyTrendPoint[] = [];

  readonly barW = 30;
  readonly gap = 10;

  get w(): number {
    return 6 + this.weeks.length * (this.barW + this.gap);
  }

  private get maxMinutes(): number {
    return Math.max(1, ...this.weeks.map((p) => p.minutes));
  }

  barHeight(minutes: number): number {
    return (minutes / this.maxMinutes) * 120;
  }

  barX(index: number): number {
    return 6 + index * (this.barW + this.gap);
  }

  weekLabel(weekStart: string): string {
    const d = new Date(weekStart + 'T00:00:00Z');
    return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
  }

  hoursLabel(minutes: number): string {
    const hours = Math.round((minutes / 60) * 10) / 10;
    return `${hours} sa`;
  }
}
