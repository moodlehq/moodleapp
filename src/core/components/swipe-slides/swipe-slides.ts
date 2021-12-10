// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
    Component, ContentChild, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, TemplateRef, ViewChild,
} from '@angular/core';
import { CoreSwipeSlidesItemsManager } from '@classes/items-management/slides-items-manager';
import { IonContent, IonSlides } from '@ionic/angular';
import { CoreDomUtils } from '@services/utils/dom';

/**
 * Helper component to display swipable slides.
 */
@Component({
    selector: 'core-swipe-slides',
    templateUrl: 'swipe-slides.html',
    styleUrls: ['swipe-slides.scss'],
})
export class CoreSwipeSlidesComponent<Item = unknown> implements OnChanges, OnDestroy {

    @Input() manager?: CoreSwipeSlidesItemsManager<Item>;
    @Input() options: CoreSwipeSlidesOptions = {};
    @Output() onInit = new EventEmitter<CoreSwipeCurrentItemData<Item>>();
    @Output() onWillChange = new EventEmitter<CoreSwipeCurrentItemData<Item>>();
    @Output() onDidChange = new EventEmitter<CoreSwipeCurrentItemData<Item>>();

    @ViewChild(IonSlides) slides?: IonSlides;
    @ContentChild(TemplateRef) template?: TemplateRef<unknown>; // Template defined by the content.

    protected hostElement: HTMLElement;
    protected unsubscribe?: () => void;

    constructor(
        elementRef: ElementRef<HTMLElement>,
        protected content?: IonContent,
    ) {
        this.hostElement = elementRef.nativeElement;
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(): void {
        if (!this.unsubscribe && this.manager) {
            this.initialize(this.manager);
        }
    }

    /**
     * Initialize some properties based on the manager.
     */
    protected async initialize(manager: CoreSwipeSlidesItemsManager<Item>): Promise<void> {
        this.unsubscribe = manager.getSource().addListener({
            onItemsUpdated: () => this.onItemsUpdated(),
        });

        // Don't call default callbacks on init, emit our own events instead.
        // This is because default callbacks aren't triggered for position 0, and to prevent auto scroll on init.
        this.options.runCallbacksOnInit = false;

        await manager.getSource().waitForInitialized();

        if (this.options.initialSlide === undefined) {
            // Calculate the initial slide.
            const position = manager.getSource().getInitialPosition();
            this.options.initialSlide = position > - 1 ? position : 0;
        }

        // Emit change events with the initial item.
        const items = manager.getSource().getItems();
        if (!items || !items.length) {
            return;
        }

        // Validate that the initial position is inside the valid range.
        let initialPosition = this.options.initialSlide as number;
        if (initialPosition < 0) {
            initialPosition = 0;
        } else if (initialPosition >= items.length) {
            initialPosition = items.length - 1;
        }

        const initialItemData = {
            index: initialPosition,
            item: items[initialPosition],
        };

        manager.setSelectedItem(items[initialPosition]);
        this.onWillChange.emit(initialItemData);
        this.onDidChange.emit(initialItemData);
    }

    /**
     * Slide to a certain position.
     *
     * @param index Position.
     * @param speed Animation speed.
     * @param runCallbacks Whether to run callbacks.
     */
    slideToIndex(index: number, speed?: number, runCallbacks?: boolean): void {
        this.slides?.slideTo(index, speed, runCallbacks);
    }

    /**
     * Slide to a certain item.
     *
     * @param item Item.
     * @param speed Animation speed.
     * @param runCallbacks Whether to run callbacks.
     */
    slideToItem(item: Partial<Item>, speed?: number, runCallbacks?: boolean): void {
        const index = this.manager?.getSource().getItemPosition(item) ?? -1;
        if (index != -1) {
            this.slides?.slideTo(index, speed, runCallbacks);
        }
    }

    /**
     * Slide to next slide.
     *
     * @param speed Animation speed.
     * @param runCallbacks Whether to run callbacks.
     */
    slideNext(speed?: number, runCallbacks?: boolean): void {
        this.slides?.slideNext(speed, runCallbacks);
    }

    /**
     * Slide to previous slide.
     *
     * @param speed Animation speed.
     * @param runCallbacks Whether to run callbacks.
     */
    slidePrev(speed?: number, runCallbacks?: boolean): void {
        this.slides?.slidePrev(speed, runCallbacks);
    }

    /**
     * Get current item.
     *
     * @return Current item. Undefined if no current item yet.
     */
    getCurrentItem(): Item | null {
        return this.manager?.getSelectedItem() || null;
    }

    /**
     * Called when items list has been updated.
     *
     * @param items New items.
     */
    protected onItemsUpdated(): void {
        const currentItem = this.getCurrentItem();

        if (!currentItem || !this.manager) {
            return;
        }

        // Keep the same slide in case the list has changed.
        const newIndex = this.manager.getSource().getItemPosition(currentItem) ?? -1;
        if (newIndex != -1) {
            this.slides?.slideTo(newIndex, 0, false);
        }
    }

    /**
     * Slide will change.
     */
    async slideWillChange(): Promise<void> {
        const currentItemData = await this.getCurrentSlideItemData();
        if (!currentItemData) {
            return;
        }

        this.manager?.setSelectedItem(currentItemData.item);

        this.onWillChange.emit(currentItemData);

        if (this.options.scrollOnChange !== 'top') {
            return;
        }

        // Scroll top. This can be improved in the future to keep the scroll for each slide.
        const scrollElement = await this.content?.getScrollElement();

        if (!scrollElement || CoreDomUtils.isElementOutsideOfScreen(scrollElement, this.hostElement, 'top')) {
            // Scroll to top.
            this.hostElement.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Slide did change.
     */
    async slideDidChange(): Promise<void> {
        const currentItemData = await this.getCurrentSlideItemData();
        if (!currentItemData) {
            return;
        }

        this.onDidChange.emit(currentItemData);
    }

    /**
     * Get current item and index based on current slide.
     *
     * @return Promise resolved with current item data. Null if not found.
     */
    protected async getCurrentSlideItemData(): Promise<CoreSwipeCurrentItemData<Item> | null> {
        if (!this.slides || !this.manager) {
            return null;
        }

        const index = await this.slides.getActiveIndex();
        const items = this.manager.getSource().getItems();
        const currentItem = items && items[index];

        if (!currentItem) {
            return null;
        }

        return {
            item: currentItem,
            index,
        };
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.unsubscribe && this.unsubscribe();
    }

}

/**
 * Options to pass to the component.
 *
 * @todo Change unknown with the right type once Swiper library is used.
 */
export type CoreSwipeSlidesOptions = Record<string, unknown> & {
    scrollOnChange?: 'top' | 'none'; // Scroll behaviour on change slide. By default, none.
};

/**
 * Data about current item.
 */
export type CoreSwipeCurrentItemData<Item> = {
    index: number;
    item: Item;
};
