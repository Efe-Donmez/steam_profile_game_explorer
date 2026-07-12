import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export interface GenreOrbitItem {
  name: string;
  pct: number;
}

interface ResolvedItem extends GenreOrbitItem {
  x: number;
  y: number;
  r: number;
}

@Component({
  selector: 'app-genre-orbit-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      .node {
        transition: stroke-width 150ms ease;
        cursor: pointer;
      }
      .node:hover {
        stroke-width: 4;
      }
    `,
  ],
  template: `
    <svg width="420" height="420" viewBox="0 0 420 420" style="overflow: visible;">
      @for (r of [1, 2, 3, 4]; track r) {
        <circle [attr.cx]="cx" [attr.cy]="cy" [attr.r]="r * 38" fill="none" stroke="#1B2436" stroke-width="1" />
      }
      @for (p of resolvedItems; track p.name; let i = $index) {
        <line
          class="anim-svg-pop"
          [style.animation-delay.ms]="i * 70"
          [attr.x1]="cx"
          [attr.y1]="cy"
          [attr.x2]="p.x"
          [attr.y2]="p.y"
          stroke="#4CF3FF"
          stroke-width="1"
          opacity="0.3"
        />
      }
      <circle [attr.cx]="cx" [attr.cy]="cy" r="13" fill="#060A14" stroke="#4CF3FF" stroke-width="2" />
      <text [attr.x]="cx" [attr.y]="cy + 4" text-anchor="middle" fill="#4CF3FF" style="font-family:'IBM Plex Mono',monospace; font-size:9px; font-weight:600;">SEN</text>
      @for (p of resolvedItems; track p.name; let i = $index) {
        <circle
          class="node anim-svg-pop"
          (click)="nodeClick.emit(p.name)"
          [style.animation-delay.ms]="100 + i * 70"
          [attr.cx]="p.x"
          [attr.cy]="p.y"
          [attr.r]="p.r"
          fill="#0E1524"
          stroke="#4CF3FF"
          stroke-width="2"
        >
          <title>{{ p.name }}: %{{ p.pct }}</title>
        </circle>
        <text
          class="anim-svg-pop"
          [style.animation-delay.ms]="150 + i * 70"
          [attr.x]="p.x + (p.x > cx ? 13 : p.x < cx ? -13 : 0)"
          [attr.y]="p.y + (p.y > cy ? 18 : p.y < cy ? -12 : 4)"
          [attr.text-anchor]="p.x > cx ? 'start' : p.x < cx ? 'end' : 'middle'"
          fill="#E9EEF5"
          style="font-family:'IBM Plex Mono',monospace; font-size:11px;"
        >
          {{ p.name }} %{{ p.pct }}
        </text>
      }
    </svg>
  `,
})
export class GenreOrbitChartComponent {
  @Input() items: GenreOrbitItem[] = [];
  @Output() nodeClick = new EventEmitter<string>();

  readonly cx = 210;
  readonly cy = 210;

  get resolvedItems(): ResolvedItem[] {
    const step = 360 / (this.items.length || 1);
    return this.items.map((item, i) => {
      const angle = -90 + i * step;
      const rad = (angle * Math.PI) / 180;
      const dist = 36 + item.pct * 5.2;
      return {
        ...item,
        x: this.cx + Math.cos(rad) * dist,
        y: this.cy + Math.sin(rad) * dist,
        r: 5 + item.pct / 8,
      };
    });
  }
}
