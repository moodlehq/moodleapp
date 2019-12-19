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

import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreTagProvider } from '@core/tag/providers/tag';
import { CoreTagAreaDelegate } from '@core/tag/providers/area-delegate';

/**
 * Page that displays the tag index.
 */
@IonicPage({ segment: 'core-tag-index' })
@Component({
    selector: 'page-core-tag-index',
    templateUrl: 'index.html',
})
export class CoreTagIndexPage {
    @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;

    tagId: number;
    tagName: string;
    collectionId: number;
    areaId: number;
    fromContextId: number;
    contextId: number;
    recursive: boolean;
    loaded = false;
    areas: Array<{
        id: number,
        componentName: string,
        itemType: string,
        nameKey: string,
        items: any[],
        canLoadMore: boolean,
        badge: string
    }>;
    selectedAreaId: number;
    hasUnsupportedAreas = false;

    constructor(navParams: NavParams, private tagProvider: CoreTagProvider, private domUtils: CoreDomUtilsProvider,
            private tagAreaDelegate: CoreTagAreaDelegate) {
        this.tagId = navParams.get('tagId') || 0;
        this.tagName = navParams.get('tagName') || '';
        this.collectionId = navParams.get('collectionId');
        this.areaId = navParams.get('areaId') || 0;
        this.fromContextId = navParams.get('fromContextId') || 0;
        this.contextId = navParams.get('contextId') || 0;
        this.recursive = navParams.get('recursive') || true;
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchData().then(() => {
            if (this.splitviewCtrl.isOn() && this.areas && this.areas.length > 0) {
                const area = this.areas.find((area) => area.id == this.areaId);
                this.openArea(area || this.areas[0]);
            }
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Fetch first page of tag index per area.
     *
     * @return Resolved when done.
     */
    fetchData(): Promise<any> {
        return this.tagProvider.getTagIndexPerArea(this.tagId, this.tagName, this.collectionId, this.areaId, this.fromContextId,
                this.contextId, this.recursive, 0).then((areas) => {
            this.areas = [];
            this.hasUnsupportedAreas = false;

            return Promise.all(areas.map((area) => {
                return this.tagAreaDelegate.parseContent(area.component, area.itemtype, area.content).then((items) => {
                    if (!items || !items.length) {
                        // Tag area not supported, skip.
                        this.hasUnsupportedAreas = true;

                        return null;
                    }

                    return {
                        id: area.ta,
                        componentName: area.component,
                        itemType: area.itemtype,
                        nameKey: this.tagAreaDelegate.getDisplayNameKey(area.component, area.itemtype),
                        items,
                        canLoadMore: !!area.nextpageurl,
                        badge: items && items.length ? items.length + (area.nextpageurl ? '+' : '') : '',
                    };
                });
            })).then((areas) => {
                this.areas = areas.filter((area) => area != null);
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error loading tag index');
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
            this.fetchData().finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * Navigate to an index area.
     *
     * @param area Area.
     */
    openArea(area: any): void {
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
            componentName: area.component,
            itemType: area.itemType,
            items: area.items.slice(),
            canLoadMore: area.canLoadMore,
            nextPage: 1
        };
        this.splitviewCtrl.push('CoreTagIndexAreaPage', params);
    }
}
