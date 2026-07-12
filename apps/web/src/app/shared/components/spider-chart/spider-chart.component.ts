import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface SpiderAxis {
  name: string;
  pct: number;
}

interface ResolvedAxis extends SpiderAxis {
  x: number;
  y: number;
  labelX: number;
  labelY: number;
}

@Component({
  selector: 'app-spider-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg width="220" height="220" viewBox="0 0 220 220" style="overflow: visible;">
      @for (f of [0.33, 0.66, 1]; track f) {
        <polygon [attr.points]="ringPoints(f)" fill="none" stroke="#1B2436" stroke-width="1" />
      }
      <polygon [attr.points]="shapePoints()" fill="rgba(76,243,255,0.15)" stroke="#4CF3FF" stroke-width="1.5" />
      @for (p of resolvedAxes; track p.name) {
        <text
          [attr.x]="p.labelX"
          [attr.y]="p.labelY"
          text-anchor="middle"
          fill="#7C8AA0"
          style="font-family:'IBM Plex Mono',monospace; font-size:8px;"
        >
          {{ p.name }}
        </text>
      }
    </svg>
  `,
})
export class SpiderChartComponent {
  @Input() axes: SpiderAxis[] = [];

  readonly cx = 110;
  readonly cy = 110;
  readonly maxR = 80;

  private get step(): number {
    return 360 / (this.axes.length || 1);
  }

  get resolvedAxes(): ResolvedAxis[] {
    return this.axes.map((a, i) => {
      const angle = -90 + i * this.step;
      const rad = (angle * Math.PI) / 180;
      const r = (a.pct / 100) * this.maxR;
      return {
        ...a,
        x: this.cx + Math.cos(rad) * r,
        y: this.cy + Math.sin(rad) * r,
        labelX: this.cx + Math.cos(rad) * (this.maxR + 22),
        labelY: this.cy + Math.sin(rad) * (this.maxR + 22),
      };
    });
  }

  ringPoints(frac: number): string {
    return this.axes
      .map((_, i) => {
        const angle = -90 + i * this.step;
        const rad = (angle * Math.PI) / 180;
        return `${this.cx + Math.cos(rad) * this.maxR * frac},${this.cy + Math.sin(rad) * this.maxR * frac}`;
      })
      .join(' ');
  }

  shapePoints(): string {
    return this.resolvedAxes.map((p) => `${p.x},${p.y}`).join(' ');
  }
}
