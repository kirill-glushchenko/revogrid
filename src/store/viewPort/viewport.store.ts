/**
 * Store is responsible for visible
 * Viewport information for each dimension
 * Redraw items during scrolling
 */

import { createStore } from '@stencil/store';

import { addMissingItems, DimensionDataViewport, getFirstItem, getLastItem, getUpdatedItemsByPosition, isActiveRange, setItemSizes, updateMissingAndRange } from './viewport.helpers';

import { setStore } from '../../utils/store.utils';
import { Observable, RevoGrid } from '../../interfaces';

function initialState(): RevoGrid.ViewportState {
  return {
    // virtual item information per rendered item
    items: [],
    // virtual dom item order to render
    start: 0,

    end: 0,

    // size of viewport in px
    virtualSize: 0,

    // total number of items
    realCount: 0,

    // last coordinate for store position restore
    lastCoordinate: 0,
  };
}

export default class ViewportStore {
  readonly store: Observable<RevoGrid.ViewportState>;
  constructor() {
    this.store = createStore(initialState());
    this.store.onChange('realCount', () => this.clear());
  }

  /** Render viewport based on coordinate, this is main method for draw */
  setViewPortCoordinate(position: number, dimension: DimensionDataViewport): void {
    let virtualSize = this.store.get('virtualSize');
    // no visible data to calculate
    if (!virtualSize) {
      return;
    }

    const frameOffset: number = dimension.frameOffset;
    const outsize: number = frameOffset * 2 * dimension.originItemSize;
    virtualSize += outsize;

    let maxCoordinate: number = virtualSize;
    if (dimension.realSize > virtualSize) {
      maxCoordinate = dimension.realSize - virtualSize;
    }
    let toUpdate: Partial<RevoGrid.ViewportState> = {
      lastCoordinate: position,
    };
    let pos: number = position;
    pos -= frameOffset * dimension.originItemSize;
    pos = pos < 0 ? 0 : pos < maxCoordinate ? pos : maxCoordinate;

    const firstItem: RevoGrid.VirtualPositionItem | undefined = getFirstItem(this.getItems());
    const lastItem: RevoGrid.VirtualPositionItem | undefined = getLastItem(this.getItems());

    // left position changed
    if (!isActiveRange(pos, firstItem)) {
      toUpdate = {
        ...toUpdate,
        ...getUpdatedItemsByPosition(pos, this.getItems(), this.store.get('realCount'), virtualSize, dimension),
      };
      setStore(this.store, { ...toUpdate });
      // right position changed
    } else if (firstItem && this.store.get('virtualSize') + pos > lastItem?.end) {
      // check is any item missing for full fill content
      const missing = addMissingItems(firstItem, this.store.get('realCount'), virtualSize + pos - firstItem.start, this.getItems(), dimension);

      if (missing.length) {
        const items = [...this.store.get('items')];
        const range = {
          start: this.store.get('start'),
          end: this.store.get('end'),
        };
        updateMissingAndRange(items, missing, range);
        toUpdate = {
          ...toUpdate,
          items: [...items],
          ...range,
        };
        setStore(this.store, { ...toUpdate });
      }
    }
  }

  /** Update viewport sizes */
  setViewPortDimension(sizes: RevoGrid.ViewSettingSizeProp, dropToOriginalSize?: number): void {
    let items = this.store.get('items');
    const count = items.length;
    // viewport not inited
    if (!count) {
      return;
    }

    let changedCoordinate = 0;
    let i = 0;
    let start = this.store.get('start');

    // drop to original size if requested
    if (dropToOriginalSize) {
      items = setItemSizes(
        items,
        start,
        dropToOriginalSize,
        this.store.get('lastCoordinate')
      );
    }

    // loop through array from initial item after recombination
    while (i < count) {
      const item = items[start];
      // change pos if size change present before
      if (changedCoordinate) {
        item.start += changedCoordinate;
        item.end += changedCoordinate;
      }
      // change size
      const size: number | undefined = sizes[item.itemIndex];
      if (size) {
        const changedSize = size - item.size;
        changedCoordinate += changedSize;
        item.size = size;
        item.end = item.start + size;
      }

      // loop by start index
      start++;
      i++;
      if (start === count) {
        start = 0;
      }
    }

    setStore(this.store, { items: [...items] });
  }

  getItems(): Pick<RevoGrid.ViewportStateItems, 'items' | 'start' | 'end'> {
    return {
      items: this.store.get('items'),
      start: this.store.get('start'),
      end: this.store.get('end'),
    };
  }

  setViewport(data: Partial<RevoGrid.ViewportState>): void {
    setStore(this.store, data);
  }

  clear(): void {
    this.store.set('items', []);
  }
}
