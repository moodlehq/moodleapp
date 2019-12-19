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

import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChange, Optional } from '@angular/core';
import { NavController } from 'ionic-angular';
import { CoreCommentsProvider } from '../../providers/comments';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSplitViewComponent } from '@components/split-view/split-view';

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
    @Input() title?: string;
    @Input() displaySpinner = true; // Whether to display the loading spinner.
    @Output() onLoading: EventEmitter<boolean>; // Eevent that indicates whether the component is loading data.
    @Input() courseId?: number; // Course ID the comments belong to. It can be used to improve performance with filters.

    commentsLoaded = false;
    commentsCount: string;
    countError = false;
    disabled = false;

    protected updateSiteObserver;
    protected refreshCommentsObserver;
    protected commentsCountObserver;

    constructor(private navCtrl: NavController,
            private commentsProvider: CoreCommentsProvider,
            sitesProvider: CoreSitesProvider,
            eventsProvider: CoreEventsProvider,
            @Optional() private svComponent: CoreSplitViewComponent) {

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

        // Refresh comments if event received.
        this.refreshCommentsObserver = eventsProvider.on(CoreCommentsProvider.REFRESH_COMMENTS_EVENT, (data) => {
            // Verify these comments need to be updated.
            if (this.undefinedOrEqual(data, 'contextLevel') && this.undefinedOrEqual(data, 'instanceId') &&
                    this.undefinedOrEqual(data, 'component') && this.undefinedOrEqual(data, 'itemId') &&
                    this.undefinedOrEqual(data, 'area')) {

                this.doRefresh().catch(() => {
                    // Ignore errors.
                });
            }
        }, sitesProvider.getCurrentSiteId());

        // Refresh comments count if event received.
        this.commentsCountObserver = eventsProvider.on(CoreCommentsProvider.COMMENTS_COUNT_CHANGED_EVENT, (data) => {
            // Verify these comments need to be updated.
            if (!this.commentsCount.endsWith('+') && this.undefinedOrEqual(data, 'contextLevel') &&
                    this.undefinedOrEqual(data, 'instanceId') && this.undefinedOrEqual(data, 'component') &&
                    this.undefinedOrEqual(data, 'itemId') && this.undefinedOrEqual(data, 'area') && !this.countError) {
                let newNumber = parseInt(this.commentsCount, 10) + data.countChange;
                newNumber = newNumber >= 0 ? newNumber : 0;

                // Parse and unparse string.
                this.commentsCount = newNumber + '';
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
        if (changes && this.commentsLoaded) {
            this.fetchData();
        }
    }

    /**
     * Fetch comments data.
     */
    fetchData(): void {
        if (this.disabled) {
            return;
        }

        this.commentsLoaded = false;
        this.onLoading.emit(true);

        this.commentsProvider.getCommentsCount(this.contextLevel, this.instanceId, this.component, this.itemId, this.area)
                .then((commentsCount) => {
            this.commentsCount = commentsCount;
            this.countError = parseInt(this.commentsCount, 10) < 0;
            this.commentsLoaded = true;
            this.onLoading.emit(false);
        });
    }

    /**
     * Refresh comments.
     *
     * @return Promise resolved when done.
     */
    doRefresh(): Promise<any> {
        return this.invalidateComments().then(() => {
            return this.fetchData();
        });
    }

    /**
     * Invalidate comments data.
     *
     * @return Promise resolved when done.
     */
    invalidateComments(): Promise<any> {
        return this.commentsProvider.invalidateCommentsData(this.contextLevel, this.instanceId, this.component, this.itemId,
                this.area);
    }

    /**
     * Opens the comments page.
     */
    openComments(e?: Event): void {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (!this.disabled && !this.countError) {
            // Open a new state with the interpolated contents.
            const navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;

            navCtrl.push('CoreCommentsViewerPage', {
                contextLevel: this.contextLevel,
                instanceId: this.instanceId,
                componentName: this.component,
                itemId: this.itemId,
                area: this.area,
                title: this.title,
                courseId: this.courseId
            });
        }
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.updateSiteObserver && this.updateSiteObserver.off();
        this.refreshCommentsObserver && this.refreshCommentsObserver.off();
        this.commentsCountObserver && this.commentsCountObserver.off();
    }

    /**
     * Check if a certain value in data is undefined or equal to this instance value.
     *
     * @param data Data object.
     * @param name Name of the property to check.
     * @return Whether it's undefined or equal.
     */
    protected undefinedOrEqual(data: any, name: string): boolean {
        return typeof data[name] == 'undefined' || data[name] == this[name];
    }
}
