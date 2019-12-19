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

import { Component, Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTagProvider } from '@core/tag/providers/tag';
import { CoreTagAreaDelegate } from '@core/tag/providers/area-delegate';

/**
 * Page that displays the tag index area.
 */
@IonicPage({ segment: 'core-tag-index-area' })
@Component({
    selector: 'page-core-tag-index-area',
    templateUrl: 'index-area.html',
})
export class CoreTagIndexAreaPage {
    tagId: number;
    tagName: string;
    collectionId: number;
    areaId: number;
    fromContextId: number;
    contextId: number;
    recursive: boolean;
    areaNameKey: string;
    loaded = false;
    componentName: string;
    itemType: string;
    items = [];
    nextPage = 0;
    canLoadMore = false;
    areaComponent: any;
    loadMoreError = false;

    constructor(navParams: NavParams, private injector: Injector, private translate: TranslateService,
            private tagProvider: CoreTagProvider, private domUtils: CoreDomUtilsProvider,
            private tagAreaDelegate: CoreTagAreaDelegate) {
        this.tagId = navParams.get('tagId');
        this.tagName = navParams.get('tagName');
        this.collectionId = navParams.get('collectionId');
        this.areaId = navParams.get('areaId');
        this.fromContextId = navParams.get('fromContextId');
        this.contextId = navParams.get('contextId');
        this.recursive = navParams.get('recursive');
        this.areaNameKey = navParams.get('areaNameKey');

        // Pass the the following parameters to avoid fetching the first page.
        this.componentName = navParams.get('componentName');
        this.itemType = navParams.get('itemType');
        this.items = navParams.get('items') || [];
        this.nextPage = navParams.get('nextPage') || 0;
        this.canLoadMore = !!navParams.get('canLoadMore');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        let promise: Promise<any>;
        if (!this.componentName || !this.itemType || !this.items.length || this.nextPage == 0) {
            promise = this.fetchData(true);
        } else {
            promise = Promise.resolve();
        }

        promise.then(() => {
            return this.tagAreaDelegate.getComponent(this.componentName, this.itemType, this.injector).then((component) => {
                this.areaComponent = component;
            });
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Fetch next page of the tag index area.
     *
     * @param refresh Whether to refresh the data or fetch a new page.
     * @return Resolved when done.
     */
    fetchData(refresh: boolean = false): Promise<any> {
        this.loadMoreError = false;
        const page = refresh ? 0 : this.nextPage;

        return this.tagProvider.getTagIndexPerArea(this.tagId, this.tagName, this.collectionId, this.areaId, this.fromContextId,
                this.contextId, this.recursive, page).then((areas) => {
            const area = areas[0];

            return this.tagAreaDelegate.parseContent(area.component, area.itemtype, area.content).then((items) => {
                if (!items || !items.length) {
                    // Tag area not supported.
                    return Promise.reject(this.translate.instant('core.tag.errorareanotsupported'));
                }

                if (page == 0) {
                    this.items = items;
                } else {
                    this.items.push(...items);
                }
                this.componentName = area.component;
                this.itemType = area.itemtype;
                this.areaNameKey = this.tagAreaDelegate.getDisplayNameKey(area.component, area.itemtype);
                this.canLoadMore = !!area.nextpageurl;
                this.nextPage = page + 1;
            });
        }).catch((error) => {
            this.loadMoreError = true; // Set to prevent infinite calls with infinite-loading.
            this.domUtils.showErrorModalDefault(error, 'Error loading tag index');
        });
    }

    /**
     * Load more items.
     *
     * @param infiniteComplete Infinite scroll complete function.
     * @return Resolved when done.
     */
    loadMore(infiniteComplete: any): Promise<any> {
        return this.fetchData().finally(() => {
            infiniteComplete();
        });
    }

    /**
     * Refresh data.
     *
     * @param refresher Refresher.
     */
    refreshData(refresher: any): void {
        this.tagProvider.invalidateTagIndexPerArea(this.tagId, this.tagName, this.collectionId, this.areaId, this.fromContextId,
                this.contextId, this.recursive).finally(() => {
            this.fetchData(true).finally(() => {
                refresher.complete();
            });
        });
    }
}
