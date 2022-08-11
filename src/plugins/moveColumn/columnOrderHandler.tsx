import { h } from '@stencil/core';
import { EventData } from './columnDragPlugin';

export class ColumnOrderHandler {
  private element?: HTMLDivElement;
  private autoscrollEl?: HTMLElement;
  private offset = 0;
  renderAutoscroll(_: MouseEvent, parent: HTMLElement | null) {
    if (!parent) {
      return;
    }
    this.autoscrollEl = document.createElement('div');
    this.autoscrollEl.classList.add('drag-auto-scroll-y');
    parent.appendChild(this.autoscrollEl);
  }

  autoscroll(pos: number, dataContainerSize: number, direction = 'translateX') {
    if (!this.autoscrollEl) {
      return;
    }
    const helperOffset = 10;
    // calculate current y position inside of the grid active holder
    // 3 - size of element + border
    const maxScroll = Math.min(pos + helperOffset, dataContainerSize - 3);

    this.autoscrollEl.style.transform = `${direction}(${maxScroll}px)`;
    this.autoscrollEl.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  }

  start(e: MouseEvent, { el, gridRect, elScroll }: EventData, dir: 'top' | 'left'  = 'left') {
    const scrollContainerRect = elScroll.getBoundingClientRect();
    if (scrollContainerRect) {
      this.offset = scrollContainerRect[dir] - gridRect[dir];
    }
    this.renderAutoscroll(e, el);
  }

  stop() {
    if (this.element) {
      this.element.hidden = true;
    }
    this.autoscrollEl?.remove();
    this.autoscrollEl = undefined;
    this.offset = 0;
  }

  showHandler(pos: number, size: number, direction = 'translateX') {
    if (!this.element) {
      return;
    }
    // do not allow overcross top of the scrollable area, header excluded
    if (this.offset) {
      pos = Math.max(pos, this.offset);
    }
    // can not be bigger then grid end
    pos = Math.min(pos, size);
    this.element.style.transform = `${direction}(${pos}px)`;
    this.element.hidden = false;
  }

  render() {
    return <div class="drag-position-y" hidden ref={(el?: HTMLDivElement) => (this.element = el)}></div>;
  }
}
