import {
  Directive,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  Optional,
  Host,
} from '@angular/core';
import { Tooltip } from 'primeng/tooltip';

@Directive({
  selector: '[tooltipOnlyWithEllipsis][pTooltip]',
  standalone: true,
})
export class EllipsisActiveDirective implements AfterViewInit, OnDestroy {
  private resizeObserver!: ResizeObserver;

  constructor(
    private el: ElementRef,
    @Optional() @Host() private tooltip: Tooltip
  ) {}

  ngAfterViewInit() {
    this.resizeObserver = new ResizeObserver(() => this.checkEllipsis());
    this.resizeObserver.observe(this.el.nativeElement);
    this.checkEllipsis();
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private checkEllipsis() {
    const element = this.el.nativeElement;
    const isEllipsis = element.offsetWidth < element.scrollWidth;
    if (this.tooltip) {
      // Maybe a better way to enable/disable tooltip?
      this.el.nativeElement.style.pointerEvents = isEllipsis ? 'auto' : 'none';
    }
  }
}
