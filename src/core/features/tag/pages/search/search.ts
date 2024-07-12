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

import { Component, OnInit } from '@angular/core';

import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreTextUtils } from '@services/utils/text';
import { CoreTagCloud, CoreTagCollection, CoreTagCloudTag, CoreTag } from '@features/tag/services/tag';
import { Translate } from '@singletons';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { CoreNavigator } from '@services/navigator';
import { CoreMainMenuDeepLinkManager } from '@features/mainmenu/classes/deep-link-manager';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreKeyboard } from '@singletons/keyboard';

/**
 * Page that displays most used tags and allows searching.
 */
@Component({
    selector: 'page-core-tag-search',
    templateUrl: 'search.html',
    styleUrls: ['search.scss'],
})
export class CoreTagSearchPage implements OnInit {

    collectionId!: number;
    query!: string;
    collections: CoreTagCollection[] = [];
    cloud?: CoreTagCloud;
    loaded = false;
    searching = false;

    protected logView: () => void;
    protected logSearch?: () => void;

    constructor() {
        this.logView = CoreTime.once(async () => {
            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'core_tag_get_tag_cloud',
                name: Translate.instant('core.tag.searchtags'),
                data: { category: 'tag' },
                url: '/tag/search.php',
            });
        });
    }

    /**
     * View loaded.
     */
    ngOnInit(): void {
        this.collectionId = CoreNavigator.getRouteNumberParam('collectionId') || 0;
        this.query = CoreNavigator.getRouteParam('query') || '';

        const deepLinkManager = new CoreMainMenuDeepLinkManager();
        deepLinkManager.treatLink();

        this.fetchData().finally(() => {
            this.loaded = true;
        });
    }

    async fetchData(): Promise<void> {
        try {
            await Promise.all([
                this.fetchCollections(),
                this.fetchTags(),
            ]);

            if (!this.query) {
                this.logView();
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error loading tags.');
        }
    }

    /**
     * Fetch tag collections.
     *
     * @returns Resolved when done.
     */
    async fetchCollections(): Promise<void> {
        const collections = await CoreTag.getTagCollections();

        collections.forEach((collection) => {
            if (!collection.name && collection.isdefault) {
                collection.name = Translate.instant('core.tag.defautltagcoll');
            }
        });

        this.collections = collections;
    }

    /**
     * Fetch tags.
     *
     * @returns Resolved when done.
     */
    async fetchTags(): Promise<void> {
        this.cloud = await CoreTag.getTagCloud(this.collectionId, undefined, undefined, this.query);

        this.logSearch?.();
    }

    /**
     * Go to tag index page.
     */
    openTag(tag: CoreTagCloudTag): void {
        const url = CoreTextUtils.decodeURI(tag.viewurl);
        CoreContentLinksHelper.handleLink(url);
    }

    /**
     * Refresh data.
     *
     * @param refresher Refresher event.
     */
    refreshData(refresher?: HTMLIonRefresherElement): void {
        CoreUtils.allPromises([
            CoreTag.invalidateTagCollections(),
            CoreTag.invalidateTagCloud(this.collectionId, undefined, undefined, this.query),
        ]).finally(() => this.fetchData().finally(() => {
            refresher?.complete();
        }));
    }

    /**
     * Search tags.
     *
     * @param query Search query.
     * @param collectionId Collection ID to use.
     * @returns Resolved when done.
     */
    searchTags(query: string, collectionId?: number): Promise<void> {
        this.searching = true;
        this.query = query;
        if (collectionId !== undefined) {
            this.collectionId = collectionId;
        }

        this.logSearch = CoreTime.once(() => this.performLogSearch());
        CoreKeyboard.close();

        return this.fetchTags().catch((error) => {
            CoreDomUtils.showErrorModalDefault(error, 'Error loading tags.');
        }).finally(() => {
            this.searching = false;
        });
    }

    /**
     * Log search.
     */
    protected async performLogSearch(): Promise<void> {
        if (!this.query) {
            return;
        }

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
            ws: 'core_tag_get_tag_cloud',
            name: Translate.instant('core.tag.searchtags'),
            data: { category: 'tag' },
            url: `/tag/search.php&query=${this.query}&tc=${this.collectionId}&go=${Translate.instant('core.search')}`,
        });
    }

}
