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
    Component,
    ContentChild,
    CUSTOM_ELEMENTS_SCHEMA,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    Output,
    SimpleChange,
    TemplateRef,
    ViewChild,
    inject,
} from '@angular/core';
import { AsyncDirective } from '@classes/async-directive';
import { CoreSwipeSlidesItemsManager } from '@classes/items-management/swipe-slides-items-manager';
import { CorePromisedValue } from '@classes/promised-value';
import { IonContent } from '@ionic/angular';
import { CoreWait } from '@singletons/wait';
import { NgZone } from '@singletons';
import { CoreDom, VerticalPoint } from '@singletons/dom';
import { CoreEventObserver } from '@singletons/events';
import { CoreMath } from '@singletons/math';
import { CoreSwiper } from '@singletons/swiper';
import { Swiper } from 'swiper';
import { SwiperOptions } from 'swiper/types';
import { CoreBaseModule } from '@/core/base.module';

/**
 * Helper component to display swipable slides.
 */
@Component({
    selector: 'core-swipe-slides',
    templateUrl: 'swipe-slides.html',
    styleUrl: 'swipe-slides.scss',
    imports: [CoreBaseModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CoreSwipeSlidesComponent<Item = unknown> implements OnChanges, OnDestroy, AsyncDirective {

    @Input() manager?: CoreSwipeSlidesItemsManager<Item>;
    @Input() options: CoreSwipeSlidesOptions = {};
    @Output() onWillChange = new EventEmitter<CoreSwipeCurrentItemData<Item>>();
    @Output() onDidChange = new EventEmitter<CoreSwipeCurrentItemData<Item>>();

    protected swiper?: Swiper;
    @ViewChild('swiperRef') set swiperRef(swiperRef: ElementRef) {
        /**
         * This setTimeout waits for Ionic's async initialization to complete.
         * Otherwise, an outdated swiper reference will be used.
         */
        setTimeout(async () => {
            const swiper = CoreSwiper.initSwiperIfAvailable(this.swiper, swiperRef, this.options);
            if (!swiper) {
                return;
            }

            this.swiper = swiper;

            await this.initialize();

            if (this.options.initialSlide) {
                this.swiper.slideTo(this.options.initialSlide, 0, this.options.runCallbacksOnInit);
            }

            this.swiper.on('slideChangeTransitionStart', () => NgZone.run(() => this.slideWillChange()));
            this.swiper.on('slideChangeTransitionEnd', () => NgZone.run(() => this.slideDidChange()));
        });
    }

    @ContentChild(TemplateRef) template?: TemplateRef<{item: Item; active: boolean}>; // Template defined by the content.

    protected unsubscribe?: () => void;
    protected resizeListener: CoreEventObserver;
    protected activeSlideIndex?: number;
    protected onReadyPromise = new CorePromisedValue<void>();
    protected onUpdatePromise: CorePromisedValue<void> | null = null;
    protected hostElement: HTMLElement = inject(ElementRef).nativeElement;
    protected content = inject(IonContent);

    constructor() {
        this.resizeListener = CoreDom.onWindowResize(() => {
            this.updateSlidesComponent();
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnChanges(changes: { [name: string]: SimpleChange }): Promise<void> {
        await this.initialize();

        if (changes.options) {
            this.updateOptions();
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
        return this.activeSlideIndex === index;
    }

    /**
     * Initialize some properties based on the manager.
     */
    protected async initialize(): Promise<void> {
        if (this.unsubscribe || !this.swiper || !this.manager) {
            return;
        }

        this.unsubscribe = this.manager.getSource().addListener({
            onItemsUpdated: () => this.onItemsUpdated(),
        });

        // Don't call default callbacks on init, emit our own events instead.
        // This is because default callbacks aren't triggered for index 0, and to prevent auto scroll on init.
        this.options.runCallbacksOnInit = false;

        await this.manager.getSource().waitForLoaded();

        if (this.options.initialSlide === undefined) {
            // Calculate the initial slide.
            const index = this.manager.getSource().getInitialItemIndex();
            this.options.initialSlide = Math.max(index, 0);
        }

        // Emit change events with the initial item.
        const items = this.manager.getSource().getItems();
        if (!items || !items.length) {
            return;
        }

        // Validate that the initial index is inside the valid range.
        const initialIndex = CoreMath.clamp(this.options.initialSlide, 0, items.length - 1);

        const initialItemData = {
            index: initialIndex,
            item: items[initialIndex],
        };

        this.activeSlideIndex = initialIndex;

        this.manager.setSelectedItem(items[initialIndex]);
        this.onWillChange.emit(initialItemData);
        this.onDidChange.emit(initialItemData);

        this.onReadyPromise.resolve();
    }

    /**
     * Slide to a certain index.
     *
     * @param index Index.
     * @param speed Animation speed.
     * @param runCallbacks Whether to run callbacks.
     */
    async slideToIndex(index: number, speed?: number, runCallbacks?: boolean): Promise<void> {
        // If slides are being updated, wait for the update to finish.
        await this.ready();
        await this.onUpdatePromise;

        await this.performSlideToIndex(index, speed, runCallbacks);
    }

    /**
     * Perform the slide to index, without waiting for read/update.
     *
     * @param index Index.
     * @param speed Animation speed.
     * @param runCallbacks Whether to run callbacks.
     */
    protected async performSlideToIndex(index: number, speed = 300, runCallbacks?: boolean): Promise<void> {
        if (!this.swiper) {
            return;
        }

        // Verify that the number of slides matches the number of items.
        const slidesLength = this.swiper.slides?.length || 0;
        if (slidesLength !== this.items.length) {
            // Number doesn't match, do a new update to try to match them.
            await this.updateSlidesComponent();
        }

        if (!this.swiper.slides) {
            return;
        }
        this.swiper.slideTo(index, speed, runCallbacks);

        // The slideTo method doesn't return a promise, so the only way to know it has finished is either wait for the speed
        // time or listen to the slideChangeTransitionEnd event.
        await CoreWait.wait(speed);
    }

    /**
     * Slide to a certain item.
     *
     * @param item Item.
     * @param speed Animation speed.
     * @param runCallbacks Whether to run callbacks.
     */
    async slideToItem(item: Item, speed?: number, runCallbacks?: boolean): Promise<void> {
        const index = this.manager?.getSource().getItemIndex(item) ?? -1;
        if (index !== -1) {
            await this.slideToIndex(index, speed, runCallbacks);
        }
    }

    /**
     * Slide to next slide.
     *
     * @param speed Animation speed.
     * @param runCallbacks Whether to run callbacks.
     */
    async slideNext(speed?: number, runCallbacks?: boolean): Promise<void> {
        await this.onUpdatePromise;

        this.swiper?.slideNext(speed, runCallbacks);
    }

    /**
     * Slide to previous slide.
     *
     * @param speed Animation speed.
     * @param runCallbacks Whether to run callbacks.
     */
    async slidePrev(speed?: number, runCallbacks?: boolean): Promise<void> {
        await this.onUpdatePromise;

        this.swiper?.slidePrev(speed, runCallbacks);
    }

    /**
     * Called when items list has been updated.
     */
    protected async onItemsUpdated(): Promise<void> {
        this.onUpdatePromise = new CorePromisedValue<void>();

        // Wait for slides to be added in DOM.
        await CoreWait.nextTick();

        // Update the slides component so the slides list reflects the new items.
        await this.updateSlidesComponent();

        const currentItem = this.manager?.getSelectedItem();

        if (!currentItem || !this.manager) {
            return;
        }

        // Keep the same slide in case the list has changed.
        const index = this.manager?.getSource().getItemIndex(currentItem) ?? -1;
        if (index !== -1) {
            await this.performSlideToIndex(index, 0, false);
        }

        this.onUpdatePromise.resolve();
    }

    /**
     * Update Swiper params from options.
     */
    protected updateOptions(): void {
        if (!this.swiper) {
            return;
        }

        CoreSwiper.updateOptions(this.swiper, this.options);
    }

    /**
     * Slide will change.
     */
    async slideWillChange(): Promise<void> {
        const currentItemData = await this.getCurrentSlideItemData();
        if (!currentItemData) {
            return;
        }

        this.activeSlideIndex = undefined;
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
            this.activeSlideIndex = undefined;

            return;
        }

        // It's important to set selectedItem in here and not in WillChange, because setting the item can trigger some code to
        // load new items, and if that happens in WillChange it causes problems.
        this.activeSlideIndex = currentItemData.index;
        this.manager?.setSelectedItem(currentItemData.item);

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

        if (!scrollElement || CoreDom.isElementOutsideOfScreen(scrollElement, this.hostElement, VerticalPoint.TOP)) {
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
    async updateSlidesComponent(): Promise<void> {
        await this.ready();

        if (!this.swiper) {
            return;
        }

        this.swiper.update();

        // We need to ensure the slides are updated before continuing.
        await CoreWait.nextTicks(2);
    }

    /**
     * @inheritdoc
     */
    async ready(): Promise<void> {
        return this.onReadyPromise;
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
