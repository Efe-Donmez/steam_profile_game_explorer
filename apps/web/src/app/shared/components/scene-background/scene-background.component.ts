import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface SceneBlob {
  size: number;
  color: 'cyan' | 'violet';
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
}

@Component({
  selector: 'app-scene-background',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid-layer"></div>
    @for (blob of blobs; track $index) {
      <div
        class="blob"
        [style.width.px]="blob.size"
        [style.height.px]="blob.size"
        [style.top]="blob.top ?? 'auto'"
        [style.left]="blob.left ?? 'auto'"
        [style.right]="blob.right ?? 'auto'"
        [style.bottom]="blob.bottom ?? 'auto'"
        [style.background]="
          blob.color === 'violet'
            ? 'radial-gradient(circle, rgba(139,124,246,0.09), transparent 70%)'
            : 'radial-gradient(circle, rgba(76,243,255,0.10), transparent 70%)'
        "
      ></div>
    }
  `,
  styles: [
    `
      :host {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        overflow: hidden;
      }
      .grid-layer {
        position: fixed;
        inset: 0;
        background-image:
          linear-gradient(rgba(76, 243, 255, 0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(76, 243, 255, 0.035) 1px, transparent 1px);
        background-size: 48px 48px;
      }
      .blob {
        position: fixed;
        border-radius: 50%;
        filter: blur(120px);
      }
    `,
  ],
})
export class SceneBackgroundComponent {
  @Input() blobs: SceneBlob[] = [];
}
