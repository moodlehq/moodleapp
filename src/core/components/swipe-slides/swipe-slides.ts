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
    Component, ContentChild, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChange, TemplateRef, ViewChild,
} from '@angular/core';
import { CoreSwipeSlidesItemsManager } from '@classes/items-management/swipe-slides-items-manager';
import { IonContent } from '@ionic/angular';
import { CoreDomUtils, VerticalPoint } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreDom } from '@singletons/dom';
import { CoreEventObserver } from '@singletons/events';
import { CoreMath } from '@singletons/math';
import { Swiper } from 'swiper';
import { SwiperOptions } from 'swiper/types';
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
    @Output() onWillChange = new EventEmitter<CoreSwipeCurrentItemData<Item>>();
    @Output() onDidChange = new EventEmitter<CoreSwipeCurrentItemData<Item>>();

    protected swiper?: Swiper;
    @ViewChild('swiperRef')
    set swiperRef(swiperRef: ElementRef) {
        /**
         * This setTimeout waits for Ionic's async initialization to complete.
         * Otherwise, an outdated swiper reference will be used.
         */
        setTimeout(() => {
            if (swiperRef?.nativeElement?.swiper) {
                this.swiper = swiperRef.nativeElement.swiper as Swiper;

                Object.keys(this.options).forEach((key) => {
                    if (this.swiper) {
                        this.swiper.params[key] = this.options[key];
                    }
                });
            }
        }, 0);
    }

    @ContentChild(TemplateRef) template?: TemplateRef<unknown>; // Template defined by the content.

    protected hostElement: HTMLElement;
    protected unsubscribe?: () => void;
    protected resizeListener: CoreEventObserver;
    protected activeSlideIndexes: number[] = [];

    constructor(
        elementRef: ElementRef<HTMLElement>,
        protected content?: IonContent,
    ) {
        this.hostElement = elementRef.nativeElement;

        this.resizeListener = CoreDom.onWindowResize(() => {
            this.updateSlidesComponent();
        });
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (!this.unsubscribe && this.manager) {
            this.initialize(this.manager);
        }

        if (changes.options) {
            Object.keys(this.options).forEach((key) => {
                if (this.swiper) {
                    this.swiper.params[key] = this.options[key];
                }
            });
        }
    }

    get items(): Item[] {
        return this.manager?.getSource().getItems() || [];
    }

    get loaded(): boolean {
        return !!this.manager?.getSource().isLoaded();
    }

    /**
     * Check whether the slide with the given index is active.
     *
     * @param index Slide index.
     * @returns Whether the slide is active.
     */
    isActive(index: number): boolean {
        return this.activeSlideIndexes.includes(index);
    }

    /**
     * Initialize some properties based on the manager.
     */
    protected async initialize(manager: CoreSwipeSlidesItemsManager<Item>): Promise<void> {
        this.unsubscribe = manager.getSource().addListener({
            onItemsUpdated: () => this.onItemsUpdated(),
        });

        // Don't call default callbacks on init, emit our own events instead.
        // This is because default callbacks aren't triggered for index 0, and to prevent auto scroll on init.
        this.options.runCallbacksOnInit = false;

        await manager.getSource().waitForLoaded();

        if (this.options.initialSlide === undefined) {
            // Calculate the initial slide.
            const index = manager.getSource().getInitialItemIndex();
            this.options.initialSlide = Math.max(index, 0);
        }

        // Emit change events with the initial item.
        const items = manager.getSource().getItems();
        if (!items || !items.length) {
            return;
        }

        // Validate that the initial index is inside the valid range.
        const initialIndex = CoreMath.clamp(this.options.initialSlide, 0, items.length - 1);

        const initialItemData = {
            index: initialIndex,
            item: items[initialIndex],
        };

        this.activeSlideIndexes = [initialIndex];

        manager.setSelectedItem(items[initialIndex]);
        this.onWillChange.emit(initialItemData);
        this.onDidChange.emit(initialItemData);
    }

    /**
     * Slide to a certain index.
     *
     * @param index Index.
     * @param speed Animation speed.
     * @param runCallbacks Whether to run callbacks.
     */
    slideToIndex(index: number, speed?: number, runCallbacks?: boolean): void {
        // If slides are being updated, wait for the update to finish.
        if (!this.swiper) {
            return;
        }

        // Verify that the number of slides matches the number of items.
        const slidesLength = this.swiper.slides.length;
        if (slidesLength !== this.items.length) {
            // Number doesn't match, do a new update to try to match them.
            this.updateSlidesComponent();
        }

        this.swiper?.slideTo(index, speed, runCallbacks);
    }

    /**
     * Slide to a certain item.
     *
     * @param item Item.
     * @param speed Animation speed.
     * @param runCallbacks Whether to run callbacks.
     */
    slideToItem(item: Item, speed?: number, runCallbacks?: boolean): void {
        const index = this.manager?.getSource().getItemIndex(item) ?? -1;
        if (index != -1) {
            this.slideToIndex(index, speed, runCallbacks);
        }
    }

    /**
     * Slide to next slide.
     *
     * @param speed Animation speed.
     * @param runCallbacks Whether to run callbacks.
     */
    slideNext(speed?: number, runCallbacks?: boolean): void {
        this.swiper?.slideNext(speed, runCallbacks);
    }

    /**
     * Slide to previous slide.
     *
     * @param speed Animation speed.
     * @param runCallbacks Whether to run callbacks.
     */
    slidePrev(speed?: number, runCallbacks?: boolean): void {
        this.swiper?.slidePrev(speed, runCallbacks);
    }

    /**
     * Called when items list has been updated.
     */
    protected async onItemsUpdated(): Promise<void> {
        // Wait for slides to be added in DOM.
        await CoreUtils.nextTick();

        // Update the slides component so the slides list reflects the new items.
        this.updateSlidesComponent();

        const currentItem = this.manager?.getSelectedItem();

        if (!currentItem || !this.manager) {
            return;
        }

        // Keep the same slide in case the list has changed.
        const newIndex = this.manager.getSource().getItemIndex(currentItem) ?? -1;
        if (newIndex != -1) {
            this.swiper?.slideTo(newIndex, 0, false);
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

        this.activeSlideIndexes.push(currentItemData.index);
        this.manager?.setSelectedItem(currentItemData.item);

        this.onWillChange.emit(currentItemData);

        // Apply scroll on change. In some devices it's too soon to do it, that's why it's done again in DidChange.
        await this.applyScrollOnChange();
    }

    /**
     * Slide did change.
     */
    async slideDidChange(): Promise<void> {
        const currentItemData = await this.getCurrentSlideItemData();
        if (!currentItemData) {
            this.activeSlideIndexes = [];

            return;
        }

        this.activeSlideIndexes = [currentItemData.index];

        this.onDidChange.emit(currentItemData);

        await this.applyScrollOnChange();
    }

    /**
     * Treat scroll on change.
     *
     * @returns Promise resolved when done.
     */
    protected async applyScrollOnChange(): Promise<void> {
        if (this.options.scrollOnChange !== 'top') {
            return;
        }

        // Scroll top. This can be improved in the future to keep the scroll for each slide.
        const scrollElement = await this.content?.getScrollElement();

        if (!scrollElement || CoreDomUtils.isElementOutsideOfScreen(scrollElement, this.hostElement, VerticalPoint.TOP)) {
            // Scroll to top.
            this.hostElement.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Get current item and index based on current slide.
     *
     * @returns Promise resolved with current item data. Null if not found.
     */
    protected async getCurrentSlideItemData(): Promise<CoreSwipeCurrentItemData<Item> | null> {
        if (!this.swiper || !this.manager) {
            return null;
        }

        const index = this.swiper.activeIndex;
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
     * Update slides component.
     */
    updateSlidesComponent(): void {
        this.swiper?.update();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.unsubscribe && this.unsubscribe();
        this.resizeListener.off();
    }

}

/**
 * Options to pass to the component.
 *
 * @todo Change unknown with the right type once Swiper library is used.
 */
export type CoreSwipeSlidesOptions = SwiperOptions & {
    scrollOnChange?: 'top' | 'none'; // Scroll behaviour on change slide. By default, none.
};

/**
 * Data about current item.
 */
export type CoreSwipeCurrentItemData<Item> = {
    index: number;
    item: Item;
};
