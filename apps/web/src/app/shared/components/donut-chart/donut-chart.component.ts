import { AfterViewInit, ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';

export interface DonutBucket {
  label: string;
  count: number;
  color: string;
}

interface DonutArc extends DonutBucket {
  dash: number;
  gapDash: number;
  offset: number;
}

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg width="120" height="120" viewBox="0 0 120 120" style="flex-shrink: 0;">
      @for (arc of arcs; track arc.label) {
        <circle
          class="bar-clickable"
          (click)="segmentClick.emit(arc.label)"
          [attr.cx]="cx"
          [attr.cy]="cy"
          [attr.r]="r"
          fill="none"
          [attr.stroke]="arc.color"
          [attr.stroke-width]="sw"
          [attr.stroke-dasharray]="mounted() ? arc.dash + ' ' + arc.gapDash : '0 ' + circumference"
          [attr.stroke-dashoffset]="-arc.offset"
          [attr.transform]="'rotate(-90 ' + cx + ' ' + cy + ')'"
          style="transition: stroke-dasharray 900ms cubic-bezier(0.22, 1, 0.36, 1);"
        >
          <title>{{ arc.label }}: {{ arc.count }}</title>
        </circle>
      }
      <text [attr.x]="cx" [attr.y]="cy + 4" text-anchor="middle" fill="#E9EEF5" style="font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:600;">
        {{ centerLabel }}
      </text>
    </svg>
  `,
})
export class DonutChartComponent implements AfterViewInit {
  @Input() buckets: DonutBucket[] = [];
  @Input() centerLabel = '';
  @Output() segmentClick = new EventEmitter<string>();

  readonly cx = 60;
  readonly cy = 60;
  readonly r = 50;
  readonly sw = 18;
  readonly circumference = 2 * Math.PI * this.r;

  // Arcs render collapsed, then sweep to their real size once mounted; the
  // CSS transition on stroke-dasharray does the animation.
  readonly mounted = signal(false);

  ngAfterViewInit(): void {
    setTimeout(() => this.mounted.set(true), 50);
  }

  get arcs(): DonutArc[] {
    const total = this.buckets.reduce((sum, b) => sum + b.count, 0) || 1;
    let acc = 0;
    return this.buckets.map((b) => {
      const frac = b.count / total;
      const dash = frac * this.circumference;
      const arc: DonutArc = { ...b, dash, gapDash: this.circumference - dash, offset: acc * this.circumference };
      acc += frac;
      return arc;
    });
  }
}
