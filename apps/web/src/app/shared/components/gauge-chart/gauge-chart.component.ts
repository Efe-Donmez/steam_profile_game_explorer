import { AfterViewInit, ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';

@Component({
  selector: 'app-gauge-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg width="200" height="130" viewBox="0 0 200 130">
      <path [attr.d]="arcPath(0, 50)" fill="none" stroke="#8B7CF6" stroke-width="14" stroke-linecap="round" />
      <path [attr.d]="arcPath(50, 100)" fill="none" stroke="#4CF3FF" stroke-width="14" stroke-linecap="round" />
      <!-- Needle drawn pointing left (0 = niche); a CSS-transitioned rotate
           around the pivot animates it from 0 to the target value. -->
      <g
        [style.transform]="'rotate(' + (mounted() ? value * 1.8 : 0) + 'deg)'"
        [style.transform-origin]="cx + 'px ' + cy + 'px'"
        style="transition: transform 1100ms cubic-bezier(0.34, 1.3, 0.5, 1);"
      >
        <line [attr.x1]="cx" [attr.y1]="cy" [attr.x2]="cx - r * 0.85" [attr.y2]="cy" stroke="#E9EEF5" stroke-width="3" />
      </g>
      <circle [attr.cx]="cx" [attr.cy]="cy" r="6" fill="#E9EEF5" />
      <text [attr.x]="cx - 60" [attr.y]="cy + 22" fill="#8B7CF6" style="font-family:'IBM Plex Mono',monospace; font-size:10px;">NİŞ</text>
      <text [attr.x]="cx + 35" [attr.y]="cy + 22" fill="#4CF3FF" style="font-family:'IBM Plex Mono',monospace; font-size:10px;">MAINSTREAM</text>
    </svg>
  `,
})
export class GaugeChartComponent implements AfterViewInit {
  /** 0 = fully niche (needle points left), 100 = fully mainstream (needle points right). */
  @Input() value = 50;

  readonly cx = 100;
  readonly cy = 100;
  readonly r = 75;

  readonly mounted = signal(false);

  ngAfterViewInit(): void {
    setTimeout(() => this.mounted.set(true), 50);
  }

  arcPath(from: number, to: number): string {
    const a1 = -180 + from * 1.8;
    const a2 = -180 + to * 1.8;
    const r1 = (a1 * Math.PI) / 180;
    const r2 = (a2 * Math.PI) / 180;
    const x1 = this.cx + Math.cos(r1) * this.r;
    const y1 = this.cy + Math.sin(r1) * this.r;
    const x2 = this.cx + Math.cos(r2) * this.r;
    const y2 = this.cy + Math.sin(r2) * this.r;
    return `M ${x1} ${y1} A ${this.r} ${this.r} 0 0 1 ${x2} ${y2}`;
  }
}
