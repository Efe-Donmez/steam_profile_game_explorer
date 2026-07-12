import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-corner-brackets',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bracket bracket--tl" [style.border-color]="color"></div>
    <div class="bracket bracket--tr" [style.border-color]="color"></div>
    <div class="bracket bracket--bl" [style.border-color]="color"></div>
    <div class="bracket bracket--br" [style.border-color]="color"></div>
  `,
  styles: [
    `
      .bracket {
        position: absolute;
        width: 14px;
        height: 14px;
        opacity: 0.55;
        pointer-events: none;
      }
      .bracket--tl {
        top: 10px;
        left: 10px;
        border-top: 1.5px solid;
        border-left: 1.5px solid;
      }
      .bracket--tr {
        top: 10px;
        right: 10px;
        border-top: 1.5px solid;
        border-right: 1.5px solid;
      }
      .bracket--bl {
        bottom: 10px;
        left: 10px;
        border-bottom: 1.5px solid;
        border-left: 1.5px solid;
      }
      .bracket--br {
        bottom: 10px;
        right: 10px;
        border-bottom: 1.5px solid;
        border-right: 1.5px solid;
      }
    `,
  ],
})
export class CornerBracketsComponent {
  @Input() color = '#4CF3FF';
}
