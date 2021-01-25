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
import { IonRefresher } from '@ionic/angular';
import { CoreDomUtils } from '@services/utils/dom';
// import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreTag } from '@features/tag/services/tag';
import { CoreTagAreaDelegate } from '@features/tag/services/tag-area-delegate';
import { ActivatedRoute, Router } from '@angular/router';
import { CoreNavigator } from '@services/navigator';

/**
 * Page that displays the tag index.
 */
@Component({
    selector: 'page-core-tag-index',
    templateUrl: 'index.html',
})
export class CoreTagIndexPage implements OnInit {

    // @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;

    tagId = 0;
    tagName = '';
    collectionId = 0;
    areaId = 0;
    fromContextId = 0;
    contextId = 0;
    recursive = true;
    loaded = false;
    selectedAreaId?: number;
    hasUnsupportedAreas = false;

    areas: (CoreTagAreaDisplay | null)[] = [];

    constructor(
        protected route: ActivatedRoute,
        protected router: Router,
    ) { }

    /**
     * View loaded.
     */
    async ngOnInit(): Promise<void> {
        const navParams = this.route.snapshot.queryParams;

        this.tagId = navParams['tagId'] ? parseInt(navParams['tagId'], 10) : this.tagId;
        this.tagName = navParams['tagName'] || this.tagName;
        this.collectionId = navParams['collectionId'] ? parseInt(navParams['collectionId'], 10) : this.collectionId;
        this.areaId = navParams['areaId'] ? parseInt(navParams['areaId']!, 10) : this.areaId;
        this.fromContextId = parseInt(navParams['fromContextId'], 10) || this.fromContextId;
        this.contextId = navParams['contextId'] ? parseInt(navParams['contextId'], 10) : this.contextId;
        this.recursive = typeof navParams['recursive'] == 'undefined'? true : navParams['recursive'];

        try {
            await this.fetchData();
            /* if (this.splitviewCtrl.isOn() && this.areas && this.areas.length > 0) {
                const area = this.areas.find((area) => area.id == this.areaId);
                this.openArea(area || this.areas[0]);
            }*/
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Fetch first page of tag index per area.
     *
     * @return Resolved when done.
     */
    async fetchData(): Promise<void> {
        try {
            const areas = await CoreTag.instance.getTagIndexPerArea(
                this.tagId,
                this.tagName,
                this.collectionId,
                this.areaId,
                this.fromContextId,
                this.contextId,
                this.recursive,
                0,
            );

            this.areas = [];
            this.hasUnsupportedAreas = false;

            const areasDisplay: (CoreTagAreaDisplay | null)[] = await Promise.all(areas.map(async (area) => {
                const items = await CoreTagAreaDelegate.instance.parseContent(area.component, area.itemtype, area.content);

                if (!items || !items.length) {
                    // Tag area not supported, skip.
                    this.hasUnsupportedAreas = true;

                    return null;
                }

                return {
                    id: area.ta,
                    componentName: area.component,
                    itemType: area.itemtype,
                    nameKey: CoreTagAreaDelegate.instance.getDisplayNameKey(area.component, area.itemtype),
                    items,
                    canLoadMore: !!area.nextpageurl,
                    badge: items && items.length ? items.length + (area.nextpageurl ? '+' : '') : '',
                };
            }));

            this.areas = areasDisplay.filter((area) => area != null);

        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'Error loading tag index');
        }
    }

    /**
     * Refresh data.
     *
     * @param refresher Refresher.
     */
    refreshData(refresher?: CustomEvent<IonRefresher>): void {
        CoreTag.instance.invalidateTagIndexPerArea(
            this.tagId,
            this.tagName,
            this.collectionId,
            this.areaId,
            this.fromContextId,
            this.contextId,
            this.recursive,
        ).finally(() => {
            this.fetchData().finally(() => {
                refresher?.detail.complete();
            });
        });
    }

    /**
     * Navigate to an index area.
     *
     * @param area Area.
     */
    openArea(area: CoreTagAreaDisplay): void {
        this.selectedAreaId = area.id;

        const params = {
            tagId: this.tagId,
            tagName: this.tagName,
            collectionId: this.collectionId,
            areaId: area.id,
            fromContextId: this.fromContextId,
            contextId: this.contextId,
            recursive: this.recursive,
            areaNameKey: area.nameKey,
            componentName: area.componentName,
            itemType: area.itemType,
            items: area.items.slice(),
            canLoadMore: area.canLoadMore,
            nextPage: 1,
        };
        // this.splitviewCtrl.push('index-area', params);
        CoreNavigator.instance.navigate('../index-area', { params });
    }

}

export type CoreTagAreaDisplay = {
    id: number;
    componentName: string;
    itemType: string;
    nameKey: string;
    items: unknown[];
    canLoadMore: boolean;
    badge: string;
};
