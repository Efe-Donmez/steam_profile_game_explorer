import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export interface ScatterPoint {
  price: number;
  hours: number;
  name?: string;
  isFree?: boolean;
  appid?: number;
}

@Component({
  selector: 'app-scatter-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      .dot {
        transition:
          r 150ms ease,
          opacity 150ms ease;
        cursor: pointer;
      }
      .dot:hover {
        r: 8;
        opacity: 1;
      }
    `,
  ],
  template: `
    <svg width="100%" height="200" [attr.viewBox]="'0 0 ' + w + ' ' + h">
      <rect [attr.x]="w * 0.55" y="0" [attr.width]="w * 0.45" [attr.height]="h * 0.45" fill="rgba(76,243,255,0.08)" />
      <line [attr.x1]="pad" [attr.y1]="h - pad" [attr.x2]="w - pad" [attr.y2]="h - pad" stroke="#1B2436" stroke-width="1" />
      <line [attr.x1]="pad" [attr.y1]="pad" [attr.x2]="pad" [attr.y2]="h - pad" stroke="#1B2436" stroke-width="1" />
      @for (p of points; track $index) {
        <circle
          class="dot anim-svg-pop"
          (click)="p.appid !== undefined && pointClick.emit(p.appid)"
          [style.animation-delay.ms]="200 + ($index % 24) * 35"
          [attr.cx]="x(p.price)"
          [attr.cy]="y(p.hours)"
          r="5"
          [attr.fill]="p.isFree ? '#8B7CF6' : '#4CF3FF'"
          opacity="0.85"
        >
          @if (p.name) {
            <title>{{ p.name }} — {{ currencySymbol }}{{ p.price }} · {{ p.hours }} sa</title>
          }
        </circle>
      }
      <text [attr.x]="w - pad" y="14" text-anchor="end" fill="#4CF3FF" style="font-family:'IBM Plex Mono',monospace; font-size:9px;">
        EN İYİ DEĞER
      </text>
      <text [attr.x]="w - pad" [attr.y]="h - pad - 6" text-anchor="end" fill="#7C8AA0" style="font-family:'IBM Plex Mono',monospace; font-size:8px;">
        FİYAT ({{ currencySymbol }}) →
      </text>
      <text [attr.x]="pad + 10" y="14" fill="#7C8AA0" style="font-family:'IBM Plex Mono',monospace; font-size:8px;">
        ↑ SAAT
      </text>
    </svg>
  `,
})
export class ScatterChartComponent {
  @Input() points: ScatterPoint[] = [];
  @Input() currencySymbol = '$';
  @Output() pointClick = new EventEmitter<number>();
  @Input() maxPrice?: number;
  @Input() maxHours?: number;

  readonly w = 260;
  readonly h = 200;
  readonly pad = 10;

  private get resolvedMaxPrice(): number {
    return this.maxPrice ?? Math.max(1, ...this.points.map((p) => p.price)) * 1.05;
  }

  private get resolvedMaxHours(): number {
    return this.maxHours ?? Math.max(1, ...this.points.map((p) => p.hours)) * 1.05;
  }

  x(price: number): number {
    return this.pad + (price / this.resolvedMaxPrice) * (this.w - 2 * this.pad);
  }

  y(hours: number): number {
    return this.h - this.pad - (hours / this.resolvedMaxHours) * (this.h - 2 * this.pad);
  }
}
