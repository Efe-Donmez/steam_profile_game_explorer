import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export interface TimelineEntry {
  year: number;
  count: number;
}

@Component({
  selector: 'app-timeline-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg width="100%" height="170" [attr.viewBox]="'0 0 ' + w + ' 170'">
      @for (e of entries; track e.year; let i = $index) {
        <rect
          class="anim-svg-bar bar-clickable"
          [style.animation-delay.ms]="i * 45"
          (click)="yearClick.emit(e.year)"
          [attr.x]="barX(i)"
          [attr.y]="140 - barHeight(e.count)"
          [attr.width]="barW"
          [attr.height]="barHeight(e.count)"
          [attr.fill]="e.count === maxCount ? '#FFB84D' : '#4CF3FF'"
          [attr.opacity]="e.count === maxCount ? 1 : 0.7"
          rx="2"
        >
          <title>{{ e.year }}: {{ e.count }} oyun</title>
        </rect>
        <text [attr.x]="barX(i) + barW / 2" y="156" text-anchor="middle" fill="#7C8AA0" style="font-family:'IBM Plex Mono',monospace; font-size:9px;">
          {{ String(e.year).slice(2) }}
        </text>
      }
    </svg>
  `,
})
export class TimelineChartComponent {
  @Input() entries: TimelineEntry[] = [];
  @Output() yearClick = new EventEmitter<number>();

  readonly barW = 34;
  readonly gap = 6;
  protected readonly String = String;

  get w(): number {
    return 6 + this.entries.length * (this.barW + this.gap);
  }

  get maxCount(): number {
    return Math.max(1, ...this.entries.map((e) => e.count));
  }

  barHeight(count: number): number {
    return (count / this.maxCount) * 120;
  }

  barX(index: number): number {
    return 6 + index * (this.barW + this.gap);
  }
}
