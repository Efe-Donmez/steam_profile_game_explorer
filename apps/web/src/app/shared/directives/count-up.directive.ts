import { Directive, ElementRef, Input, OnChanges } from '@angular/core';

/**
 * Animates the host element's text from 0 to the given value with an
 * ease-out curve. Formatting uses tr-TR locale; optional prefix/suffix
 * (e.g. "₺", " SA") are rendered around the number.
 */
@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective implements OnChanges {
  @Input({ required: true, alias: 'appCountUp' }) value = 0;
  @Input() countUpPrefix = '';
  @Input() countUpSuffix = '';
  @Input() countUpDurationMs = 900;

  private frame?: number;

  constructor(private readonly el: ElementRef<HTMLElement>) {}

  ngOnChanges(): void {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !Number.isFinite(this.value)) {
      this.render(this.value);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / this.countUpDurationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      this.render(this.value * eased);
      if (t < 1) {
        this.frame = requestAnimationFrame(tick);
      }
    };
    this.frame = requestAnimationFrame(tick);
  }

  private render(value: number): void {
    this.el.nativeElement.textContent =
      this.countUpPrefix + Math.round(value).toLocaleString('tr-TR') + this.countUpSuffix;
  }
}
