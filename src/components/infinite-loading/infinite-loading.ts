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

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { InfiniteScroll } from 'ionic-angular';

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
export class CoreInfiniteLoadingComponent {
    @Input() enabled: boolean;
    @Input() error = false;
    @Input() position = 'bottom';
    @Output() action: EventEmitter<() => void>; // Will emit an event when triggered.

    loadingMore = false;   // Hide button and avoid loading more.

    protected infiniteScroll: InfiniteScroll;

    constructor() {
        this.action = new EventEmitter();
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
        this.loadingMore = false;
        this.infiniteScroll && this.infiniteScroll.complete();
        this.infiniteScroll = undefined;
    }

}
