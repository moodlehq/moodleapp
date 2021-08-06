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

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChange, ViewChild, ElementRef } from '@angular/core';
import { IonInfiniteScroll } from '@ionic/angular';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';

const THRESHOLD = .15; // % of the scroll element height that must be close to the edge to consider loading more items necessary.

/**
 * Component to show a infinite loading trigger and spinner while more data is being loaded.
 *
 * Usage:
 * <core-infinite-loading [action]="loadingAction" [enabled]="dataLoaded"></core-inifinite-loading>
 */
@Component({
    selector: 'core-infinite-loading',
    templateUrl: 'core-infinite-loading.html',
})
export class CoreInfiniteLoadingComponent implements OnChanges {

    @Input() enabled!: boolean;
    @Input() error = false;
    @Input() position: 'top' | 'bottom' = 'bottom';
    @Output() action: EventEmitter<() => void>; // Will emit an event when triggered.

    @ViewChild('topbutton') topButton?: ElementRef;
    @ViewChild('bottombutton') bottomButton?: ElementRef;
    @ViewChild('spinnercontainer') spinnerContainer?: ElementRef;
    @ViewChild(IonInfiniteScroll) infiniteScroll?: IonInfiniteScroll;

    loadingMore = false; // Hide button and avoid loading more.
    hostElement: HTMLElement;

    constructor(protected element: ElementRef<HTMLElement>) {
        this.action = new EventEmitter();
        this.hostElement = element.nativeElement;
    }

    /**
     * Detect changes on input properties.
     *
     * @param changes Changes.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {
        if (changes.enabled && this.enabled && this.position == 'bottom') {

            // Infinite scroll enabled. If the list doesn't fill the full height, infinite scroll isn't triggered automatically.
            this.checkScrollDistance();
        }
    }

    /**
     * Checks scroll distance to the beginning/end to load more items if needed.
     *
     * Previously, this function what firing an scroll event but now we have to calculate the distance
     * like the Ionic component does.
     */
    protected async checkScrollDistance(): Promise<void> {
        if (!this.enabled || this.error || this.loadingMore) {
            return;
        }

        // Wait until next tick to allow items to render and scroll content to grow.
        await CoreUtils.nextTick();

        // Calculate distance from edge.
        const content = this.hostElement.closest('ion-content');
        if (!content) {
            return;
        }

        const scrollElement = await content.getScrollElement();

        const infiniteHeight = this.hostElement.getBoundingClientRect().height;
        const scrollTop = scrollElement.scrollTop;
        const height = scrollElement.offsetHeight;
        const threshold = height * THRESHOLD;
        const distanceFromInfinite = (this.position === 'bottom')
            ? scrollElement.scrollHeight - infiniteHeight - scrollTop - threshold - height
            : scrollTop - infiniteHeight - threshold;

        // If it's close enough the edge, trigger the action to load more items.
        if (distanceFromInfinite < 0 && !this.loadingMore && this.enabled) {
            this.loadMore();
        }
    }

    /**
     * Load More items calling the action provided.
     */
    loadMore(): void {
        if (this.loadingMore) {
            return;
        }

        this.loadingMore = true;
        this.action.emit(this.complete.bind(this));
    }

    /**
     * Complete loading.
     */
    complete(): void {
        if (this.position == 'top') {
            // Wait a bit before allowing loading more, otherwise it could be re-triggered automatically when it shouldn't.
            setTimeout(this.completeLoadMore.bind(this), 400);
        } else {
            this.completeLoadMore();
        }
    }

    /**
     * Complete loading.
     */
    protected async completeLoadMore(): Promise<void> {
        this.loadingMore = false;
        await this.infiniteScroll?.complete();

        // More items loaded. If the list doesn't fill the full height, infinite scroll isn't triggered automatically.
        this.checkScrollDistance();
    }

    /**
     * Get the height of the element.
     *
     * @return Height.
     * @todo erase if not needed: I'm depreacating it because if not needed or getBoundingClientRect has the same result, it should
     * be erased, also with getElementHeight
     * @deprecated since 3.9.5
     */
    getHeight(): number {
        return (this.position == 'top' ?
            this.getElementHeight(this.topButton?.nativeElement) :
            this.getElementHeight(this.bottomButton?.nativeElement)) +
            this.getElementHeight(this.infiniteScrollElement) +
            this.getElementHeight(this.spinnerContainer?.nativeElement);
    }

    /**
     * Get the infinite scroll element.
     *
     * @return Element or null.
     */
    get infiniteScrollElement(): HTMLIonInfiniteScrollElement | null {
        return this.hostElement.querySelector('ion-infinite-scroll');
    }

    /**
     * Get the height of an element.
     *
     * @param element Element ref.
     * @return Height.
     */
    protected getElementHeight(element?: HTMLElement | null): number {
        if (element) {
            return CoreDomUtils.getElementHeight(element, true, true, true);
        }

        return 0;
    }

}
