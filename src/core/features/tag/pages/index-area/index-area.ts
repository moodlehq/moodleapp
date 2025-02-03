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

import { Component, OnInit, Type } from '@angular/core';
import { CoreTag } from '@features/tag/services/tag';
import { ActivatedRoute } from '@angular/router';
import { CoreTagAreaDelegate } from '../../services/tag-area-delegate';
import { Translate } from '@singletons';
import { CoreNavigator } from '@services/navigator';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays the tag index area.
 */
@Component({
    selector: 'page-core-tag-index-area',
    templateUrl: 'index-area.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export default class CoreTagIndexAreaPage implements OnInit {

    tagId = 0;
    tagName = '';
    collectionId = 0;
    areaId = 0;
    fromContextId = 0;
    contextId = 0;
    recursive = true;

    areaNameKey = '';
    loaded = false;
    componentName?: string;
    itemType?: string;
    items: unknown[] = [];
    nextPage = 0;
    canLoadMore = false;
    areaComponent?: Type<unknown>;
    loadMoreError = false;

    constructor(
        protected route: ActivatedRoute,
    ) { }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.route.queryParams.subscribe(async () => {
            this.loaded = false;

            this.tagId = CoreNavigator.getRouteNumberParam('tagId') || this.tagId;
            this.tagName = CoreNavigator.getRouteParam('tagName') || this.tagName;
            this.collectionId = CoreNavigator.getRouteNumberParam('collectionId') || this.collectionId;
            this.areaId = CoreNavigator.getRouteNumberParam('areaId') || this.areaId;
            this.fromContextId = CoreNavigator.getRouteNumberParam('fromContextId') || this.fromContextId;
            this.contextId = CoreNavigator.getRouteNumberParam('contextId') || this.contextId;
            this.recursive = CoreNavigator.getRouteBooleanParam('recursive') ?? true;

            this.areaNameKey = CoreNavigator.getRouteParam('areaNameKey') || '';
            // Pass the the following parameters to avoid fetching the first page.
            this.componentName = CoreNavigator.getRouteParam('componentName');
            this.itemType = CoreNavigator.getRouteParam('itemType');
            this.items = CoreNavigator.getRouteParam<unknown[]>('items') || [];
            this.nextPage = CoreNavigator.getRouteNumberParam('nextPage') || 0;
            this.canLoadMore = CoreNavigator.getRouteBooleanParam('canLoadMore') || false;

            try {
                if (!this.componentName || !this.itemType || !this.items.length || this.nextPage == 0) {
                    await this.fetchData(true);
                }

                if (this.componentName && this.itemType) {
                    this.areaComponent = await CoreTagAreaDelegate.getComponent(this.componentName, this.itemType);
                }
            } finally {
                this.loaded = true;
            }
        });
    }

    /**
     * Fetch next page of the tag index area.
     *
     * @param refresh Whether to refresh the data or fetch a new page.
     * @returns Resolved when done.
     */
    async fetchData(refresh: boolean = false): Promise<void> {
        this.loadMoreError = false;
        const page = refresh ? 0 : this.nextPage;

        try {
            const areas = await CoreTag.getTagIndexPerArea(
                this.tagId,
                this.tagName,
                this.collectionId,
                this.areaId,
                this.fromContextId,
                this.contextId,
                this.recursive,
                page,
            );
            const area = areas[0];

            const items = await CoreTagAreaDelegate.parseContent(area.component, area.itemtype, area.content);
            if (!items || !items.length) {
                // Tag area not supported.
                throw Translate.instant('core.tag.errorareanotsupported');
            }

            if (page == 0) {
                this.items = items;
            } else {
                this.items.push(...items);
            }
            this.componentName = area.component;
            this.itemType = area.itemtype;
            this.areaNameKey = CoreTagAreaDelegate.getDisplayNameKey(area.component, area.itemtype);
            this.canLoadMore = !!area.nextpageurl;
            this.nextPage = page + 1;
        } catch (error) {
            this.loadMoreError = true; // Set to prevent infinite calls with infinite-loading.
            CoreAlerts.showError(error, { default: 'Error loading tag index' });
        }
    }

    /**
     * Load more items.
     *
     * @param infiniteComplete Infinite scroll complete function.
     * @returns Resolved when done.
     */
    async loadMore(infiniteComplete?: () => void): Promise<void> {
        try {
            await this.fetchData();
        } finally {
            infiniteComplete?.();
        }
    }

    /**
     * Refresh data.
     *
     * @param refresher Refresher.
     */
    async refreshData(refresher?: HTMLIonRefresherElement): Promise<void> {
        try {
            await CoreTag.invalidateTagIndexPerArea(
                this.tagId,
                this.tagName,
                this.collectionId,
                this.areaId,
                this.fromContextId,
                this.contextId,
                this.recursive,
            );
        } finally {
            try {
                await this.fetchData(true);
            } finally {
                refresher?.complete();
            }
        }
    }

}
