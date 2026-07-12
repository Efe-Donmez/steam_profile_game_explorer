import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { OrbitPoint } from '../../models/orbit-point.model';

interface ResolvedPoint extends OrbitPoint {
  x: number;
  y: number;
}

@Component({
  selector: 'app-orbit-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size" [attr.height]="size" [attr.viewBox]="'0 0 ' + size + ' ' + size" style="overflow: visible;">
      @for (r of rings; track r) {
        <circle [attr.cx]="cx" [attr.cy]="cy" [attr.r]="r" fill="none" stroke="#1B2436" stroke-width="1" />
      }

      @if (showCrosshair) {
        <line [attr.x1]="cx" [attr.y1]="cy - rings[rings.length - 1] - 20" [attr.x2]="cx" [attr.y2]="cy + rings[rings.length - 1] + 20" stroke="#1B2436" stroke-width="1" />
        <line [attr.x1]="cx - rings[rings.length - 1] - 20" [attr.y1]="cy" [attr.x2]="cx + rings[rings.length - 1] + 20" [attr.y2]="cy" stroke="#1B2436" stroke-width="1" />
      }

      @for (p of resolvedPoints; track p.name) {
        <line [attr.x1]="cx" [attr.y1]="cy" [attr.x2]="p.x" [attr.y2]="p.y" [attr.stroke]="accentColor" stroke-width="1" opacity="0.35" />
      }

      @if (sweep !== 'none') {
        <g [class.orbit-sweep-once]="sweep === 'once'" [class.orbit-sweep-continuous]="sweep === 'continuous'" [style.transform-origin]="cx + 'px ' + cy + 'px'">
          <path [attr.d]="sweepPath" [attr.fill]="sweepFill" />
          <line [attr.x1]="cx" [attr.y1]="cy" [attr.x2]="cx" [attr.y2]="cy - sweepRadius" [attr.stroke]="accentColor" stroke-width="2" [attr.opacity]="sweepLineOpacity" />
        </g>
      }

      <circle [attr.cx]="cx" [attr.cy]="cy" [attr.r]="centerRadius" fill="#0E1524" [attr.stroke]="accentColor" stroke-width="2" />
      @if (showCenterLabel) {
        <text [attr.x]="cx" [attr.y]="cy + 4" text-anchor="middle" [attr.fill]="accentColor" style="font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:600;">{{ centerLabel }}</text>
      }

      @for (p of resolvedPoints; track p.name) {
        <circle [attr.cx]="p.x" [attr.cy]="p.y" r="7" fill="#060A14" [attr.stroke]="accentColor" stroke-width="1.5" />
        <circle [attr.cx]="p.x" [attr.cy]="p.y" r="2.5" [attr.fill]="accentColor" />
        @if (showLabels) {
          <text [attr.x]="p.x + labelDx(p.x)" [attr.y]="p.y + labelDy(p.y)" [attr.text-anchor]="labelAnchor(p.x)" fill="#E9EEF5" style="font-family:'IBM Plex Mono',monospace; font-size:12px;">{{ p.name }}</text>
        }
      }
    </svg>
  `,
  styles: [
    `
      @keyframes orbit-sweep {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      .orbit-sweep-once {
        animation: orbit-sweep 2.5s ease-out 1;
      }
      .orbit-sweep-continuous {
        animation: orbit-sweep 2.4s linear infinite;
      }
      @media (prefers-reduced-motion: reduce) {
        .orbit-sweep-once,
        .orbit-sweep-continuous {
          animation: none !important;
        }
      }
    `,
  ],
})
export class OrbitChartComponent {
  @Input() size = 520;
  @Input() centerLabel = 'SEN';
  @Input() showCenterLabel = true;
  @Input() centerRadius = 16;
  @Input() points: OrbitPoint[] = [];
  @Input() ringCount = 3;
  @Input() ringGap = 55;
  @Input() sweep: 'once' | 'continuous' | 'none' = 'once';
  @Input() sweepRadius = 165;
  @Input() sweepAngleRad = 0.6;
  @Input() sweepFillOpacity = 0.08;
  @Input() showLabels = true;
  @Input() showCrosshair = false;
  @Input() accent: 'cyan' | 'violet' = 'cyan';

  get cx(): number {
    return this.size / 2;
  }

  get cy(): number {
    return this.size / 2;
  }

  get accentColor(): string {
    return this.accent === 'violet' ? '#8B7CF6' : '#4CF3FF';
  }

  get rings(): number[] {
    return Array.from({ length: this.ringCount }, (_, i) => (i + 1) * this.ringGap);
  }

  get resolvedPoints(): ResolvedPoint[] {
    return this.points.map((p) => {
      const rad = (p.angle * Math.PI) / 180;
      return {
        ...p,
        x: this.cx + Math.cos(rad) * p.distance,
        y: this.cy + Math.sin(rad) * p.distance,
      };
    });
  }

  get sweepFill(): string {
    const rgb = this.accent === 'violet' ? '139,124,246' : '76,243,255';
    return `rgba(${rgb},${this.sweepFillOpacity})`;
  }

  get sweepLineOpacity(): number {
    return this.sweep === 'once' ? 0.9 : 1;
  }

  get sweepPath(): string {
    const { cx, cy, sweepRadius: r, sweepAngleRad: a } = this;
    const endX = cx + r * Math.sin(a);
    const endY = cy - r * Math.cos(a);
    return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${endX} ${endY} Z`;
  }

  labelAnchor(x: number): 'start' | 'end' | 'middle' {
    if (x > this.cx) return 'start';
    if (x < this.cx) return 'end';
    return 'middle';
  }

  labelDx(x: number): number {
    if (x > this.cx) return 14;
    if (x < this.cx) return -14;
    return 0;
  }

  labelDy(y: number): number {
    if (y > this.cy) return 18;
    if (y < this.cy) return -12;
    return 4;
  }
}
