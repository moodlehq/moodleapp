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

import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChange, OnInit } from '@angular/core';
import { CoreComments } from '../../services/comments';
import { CORE_COMMENTS_COUNT_CHANGED_EVENT, CORE_COMMENTS_REFRESH_EVENT } from '@features/comments/constants';
import { CoreEventObserver, CoreEvents } from '@static/events';
import { CoreSites } from '@services/sites';
import { CoreNavigator } from '@services/navigator';
import { CorePromiseUtils } from '@static/promise-utils';
import { ContextLevel } from '@/core/constants';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component that displays the count of comments.
 */
@Component({
    selector: 'core-comments',
    templateUrl: 'core-comments.html',
    styleUrl: 'comments.scss',
    imports: [
        CoreSharedModule,
    ],
})
export class CoreCommentsCommentsComponent implements OnInit, OnChanges, OnDestroy {

    @Input({ required: true }) contextLevel!: ContextLevel;
    @Input({ required: true }) instanceId!: number;
    @Input({ required: true }) component!: string;
    @Input({ required: true }) itemId!: number;
    @Input() area = '';
    @Input() title?: string;
    @Output() onLoading = new EventEmitter<boolean>();  // Event that indicates whether the component is loading data.
    @Input() courseId?: number; // Course ID the comments belong to. It can be used to improve performance with filters.
    @Input({ transform: toBoolean }) showItem = false; // Show button as an item.

    commentsLoaded = false;
    commentsCount = '';
    countError = false;
    enabled = false;

    protected updateSiteObserver: CoreEventObserver;
    protected refreshCommentsObserver: CoreEventObserver;
    protected commentsCountObserver: CoreEventObserver;

    constructor() {
        this.enabled = CoreComments.areCommentsEnabledInSite();

        // Update visibility if current site info is updated.
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            const wasEnabled = this.enabled;

            this.enabled = CoreComments.areCommentsEnabledInSite();

            if (!wasEnabled && this.enabled) {
                this.fetchData();
            }
        }, CoreSites.getCurrentSiteId());

        // Refresh comments if event received.
        this.refreshCommentsObserver = CoreEvents.on(
            CORE_COMMENTS_REFRESH_EVENT,
            (data) => {
                // Verify these comments need to be updated.
                if (this.undefinedOrEqual(data, 'contextLevel') && this.undefinedOrEqual(data, 'instanceId') &&
                    this.undefinedOrEqual(data, 'component') && this.undefinedOrEqual(data, 'itemId') &&
                    this.undefinedOrEqual(data, 'area')) {

                    CorePromiseUtils.ignoreErrors(this.doRefresh());
                }
            },
            CoreSites.getCurrentSiteId(),
        );

        // Refresh comments count if event received.
        this.commentsCountObserver = CoreEvents.on(
            CORE_COMMENTS_COUNT_CHANGED_EVENT,
            (data) => {
                // Verify these comments need to be updated.
                if (!this.commentsCount.endsWith('+') && this.undefinedOrEqual(data, 'contextLevel') &&
                    this.undefinedOrEqual(data, 'instanceId') && this.undefinedOrEqual(data, 'component') &&
                    this.undefinedOrEqual(data, 'itemId') && this.undefinedOrEqual(data, 'area') && !this.countError) {
                    let newNumber = parseInt(this.commentsCount, 10) + data.countChange;
                    newNumber = newNumber >= 0 ? newNumber : 0;

                    // Parse and unparse string.
                    this.commentsCount = `${newNumber}`;
                }
            },
            CoreSites.getCurrentSiteId(),
        );
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.fetchData();
    }

    /**
     * @inheritdoc
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
    async fetchData(): Promise<void> {
        if (!this.enabled) {
            return;
        }

        this.commentsLoaded = false;
        this.onLoading.emit(true);

        const commentsCount = await CoreComments.getCommentsCount(
            this.contextLevel,
            this.instanceId,
            this.component,
            this.itemId,
            this.area,
        );
        this.commentsCount = commentsCount;
        this.countError = parseInt(this.commentsCount, 10) < 0;
        this.commentsLoaded = true;
        this.onLoading.emit(false);
    }

    /**
     * Refresh comments.
     *
     * @returns Promise resolved when done.
     */
    async doRefresh(): Promise<void> {
        await this.invalidateComments();

        await this.fetchData();
    }

    /**
     * Invalidate comments data.
     *
     * @returns Promise resolved when done.
     */
    async invalidateComments(): Promise<void> {
        await CoreComments.invalidateCommentsData(
            this.contextLevel,
            this.instanceId,
            this.component,
            this.itemId,
            this.area,
        );
    }

    /**
     * Opens the comments page.
     *
     * @param e Event that triggered the action (optional).
     */
    openComments(e?: Event): void {
        e?.preventDefault();
        e?.stopPropagation();

        if (!this.enabled || this.countError) {
            return;
        }

        CoreNavigator.navigateToSitePath(
            `comments/${this.contextLevel}/${this.instanceId}/${this.component}/${this.itemId}/`,
            {
                params: {
                    area: this.area,
                    title: this.title,
                    courseId: this.courseId,
                },
            },
        );
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.updateSiteObserver?.off();
        this.refreshCommentsObserver?.off();
        this.commentsCountObserver?.off();
    }

    /**
     * Check if a certain value in data is undefined or equal to this instance value.
     *
     * @param data Data object.
     * @param name Name of the property to check.
     * @returns Whether it's undefined or equal.
     */
    protected undefinedOrEqual(data: Record<string, unknown>, name: string): boolean {
        return data[name] === undefined || data[name] === this[name];
    }

}
