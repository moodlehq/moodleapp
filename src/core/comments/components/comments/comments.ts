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

import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChange } from '@angular/core';
import { NavController } from 'ionic-angular';
import { CoreCommentsProvider } from '../../providers/comments';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';

/**
 * Component that displays the count of comments.
 */
@Component({
    selector: 'core-comments',
    templateUrl: 'core-comments.html',
})
export class CoreCommentsCommentsComponent implements OnChanges, OnDestroy {
    @Input() contextLevel: string;
    @Input() instanceId: number;
    @Input() component: string;
    @Input() itemId: number;
    @Input() area = '';
    @Input() page = 0;
    @Input() title?: string;
    @Input() displaySpinner = true; // Whether to display the loading spinner.
    @Output() onLoading: EventEmitter<boolean>; // Eevent that indicates whether the component is loading data.

    commentsLoaded = false;
    commentsCount: number;
    disabled = false;

    protected updateSiteObserver;

    constructor(private navCtrl: NavController, private commentsProvider: CoreCommentsProvider,
            sitesProvider: CoreSitesProvider, eventsProvider: CoreEventsProvider) {
        this.onLoading = new EventEmitter<boolean>();

        this.disabled = this.commentsProvider.areCommentsDisabledInSite();

        // Update visibility if current site info is updated.
        this.updateSiteObserver = eventsProvider.on(CoreEventsProvider.SITE_UPDATED, () => {
            const wasDisabled = this.disabled;

            this.disabled = this.commentsProvider.areCommentsDisabledInSite();

            if (wasDisabled && !this.disabled) {
                this.fetchData();
            }
        }, sitesProvider.getCurrentSiteId());
    }

    /**
     * View loaded.
     */
    ngOnInit(): void {
        this.fetchData();
    }

    /**
     * Listen to changes.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        // If something change, update the fields.
        if (changes) {
            this.fetchData();
        }
    }

    protected fetchData(): void {
        if (this.disabled) {
            return;
        }

        this.commentsLoaded = false;
        this.onLoading.emit(true);

        this.commentsProvider.getComments(this.contextLevel, this.instanceId, this.component, this.itemId, this.area, this.page)
            .then((comments) => {
                this.commentsCount = comments && comments.length ? comments.length : 0;
            }).catch(() => {
                this.commentsCount = -1;
            }).finally(() => {
                this.commentsLoaded = true;
                this.onLoading.emit(false);
            });
    }

    /**
     * Opens the comments page.
     */
    openComments(): void {
        if (!this.disabled && this.commentsCount > 0) {
            // Open a new state with the interpolated contents.
            this.navCtrl.push('CoreCommentsViewerPage', {
                contextLevel: this.contextLevel,
                instanceId: this.instanceId,
                component: this.component,
                itemId: this.itemId,
                area: this.area,
                page: this.page,
                title: this.title,
            });
        }
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.updateSiteObserver && this.updateSiteObserver.off();
    }
}
