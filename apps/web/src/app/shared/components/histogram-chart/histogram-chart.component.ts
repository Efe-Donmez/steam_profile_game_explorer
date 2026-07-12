import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export interface HistogramBucket {
  label: string;
  count: number;
}

@Component({
  selector: 'app-histogram-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg width="100%" height="200" [attr.viewBox]="'0 0 ' + w + ' ' + h">
      @for (b of buckets; track b.label; let i = $index) {
        <rect
          class="anim-svg-bar bar-clickable"
          [style.animation-delay.ms]="i * 70"
          (click)="bucketClick.emit(b.label)"
          [attr.x]="barX(i)"
          [attr.y]="150 - barHeight(b.count)"
          [attr.width]="barW"
          [attr.height]="barHeight(b.count)"
          [attr.fill]="b.label === unratedLabel ? '#1B2436' : '#4CF3FF'"
          [attr.opacity]="b.label === unratedLabel ? 1 : 0.85"
          rx="2"
        >
          <title>{{ b.label }}: {{ b.count }} oyun</title>
        </rect>
        <text [attr.x]="barX(i) + barW / 2" y="168" text-anchor="middle" fill="#7C8AA0" style="font-family:'IBM Plex Mono',monospace; font-size:8px;">
          {{ b.label }}
        </text>
      }
      @if (averageValue !== undefined) {
        <line [attr.x1]="avgX()" y1="5" [attr.x2]="avgX()" y2="150" stroke="#4CF3FF" stroke-width="1.5" stroke-dasharray="3,3" />
        <text [attr.x]="avgX()" y="184" text-anchor="middle" fill="#4CF3FF" style="font-family:'IBM Plex Mono',monospace; font-size:8px;">
          ORT. {{ averageValue }}
        </text>
      }
    </svg>
  `,
})
export class HistogramChartComponent {
  @Input() buckets: HistogramBucket[] = [];
  @Output() bucketClick = new EventEmitter<string>();
  @Input() averageValue?: number;
  @Input() unratedLabel = '—';
  @Input() scoredBucketCount = 6;

  readonly w = 280;
  readonly h = 200;
  readonly barW = 30;
  readonly gap = 8;

  private get maxCount(): number {
    return Math.max(1, ...this.buckets.map((b) => b.count));
  }

  barHeight(count: number): number {
    return (count / this.maxCount) * 140;
  }

  barX(index: number): number {
    return 6 + index * (this.barW + this.gap);
  }

  avgX(): number {
    const value = this.averageValue ?? 0;
    const span = this.scoredBucketCount * (this.barW + this.gap);
    return 6 + Math.min(1, Math.max(0, value / 100)) * span;
  }
}
