// (C) Copyright 2015 Martin Dougiamas
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

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChange, Optional, ViewChild, ElementRef } from '@angular/core';
import { InfiniteScroll, Content } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';

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
    @Input() enabled: boolean;
    @Input() error = false;
    @Input() position = 'bottom';
    @Output() action: EventEmitter<() => void>; // Will emit an event when triggered.

    @ViewChild('topbutton') topButton: ElementRef;
    @ViewChild('infinitescroll') infiniteEl: ElementRef;
    @ViewChild('bottombutton') bottomButton: ElementRef;
    @ViewChild('spinnercontainer') spinnerContainer: ElementRef;

    loadingMore = false;   // Hide button and avoid loading more.

    protected infiniteScroll: InfiniteScroll;

    constructor(@Optional() private content: Content, private domUtils: CoreDomUtilsProvider) {
        this.action = new EventEmitter();
    }

    /**
     * Detect changes on input properties.
     *
     * @param {SimpleChange}} changes Changes.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {
        if (changes.enabled && this.enabled && this.position == 'bottom') {
            // Infinite scroll enabled. If the list doesn't fill the full height, infinite scroll isn't triggered automatically.
            // Send a fake scroll event to make infinite scroll check if it should load more items.
            setTimeout(() => {
                const event: any = new Event('scroll');
                this.content.ionScroll.emit(event);
            }, 400);
        }
    }

    /**
     * Load More items calling the action provided.
     *
     * @param {InfiniteScroll} [infiniteScroll] Infinite scroll object only if triggered from the scroll.
     */
    loadMore(infiniteScroll?: InfiniteScroll): void {
        if (this.loadingMore) {
            return;
        }

        if (infiniteScroll) {
            this.infiniteScroll = infiniteScroll;
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
    protected completeLoadMore(): void {
        this.loadingMore = false;
        this.infiniteScroll && this.infiniteScroll.complete();
        this.infiniteScroll = undefined;

        // More items loaded. If the list doesn't fill the full height, infinite scroll isn't triggered automatically.
        // Send a fake scroll event to make infinite scroll check if it should load more items.
        setTimeout(() => {
            const event: any = new Event('scroll');
            this.content.ionScroll.emit(event);
        });
    }

    /**
     * Get the height of the element.
     *
     * @return {number} Height.
     */
    getHeight(): number {
        return this.getElementHeight(this.topButton) + this.getElementHeight(this.infiniteEl) +
                this.getElementHeight(this.bottomButton) + this.getElementHeight(this.spinnerContainer);
    }

    /**
     * Get the height of an element.
     *
     * @param {ElementRef} element Element ref.
     * @return {number} Height.
     */
    protected getElementHeight(element: ElementRef): number {
        if (element && element.nativeElement) {
            return this.domUtils.getElementHeight(element.nativeElement, true, true, true);
        }

        return 0;
    }

}
