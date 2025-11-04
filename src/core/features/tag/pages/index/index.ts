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
import { CoreTag } from '@features/tag/services/tag';
import { CoreTagAreaDelegate } from '@features/tag/services/tag-area-delegate';
import { CoreScreen } from '@services/screen';
import { CoreNavigator } from '@services/navigator';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { Translate } from '@singletons';
import { CoreUrl } from '@singletons/url';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays the tag index.
 */
@Component({
    selector: 'page-core-tag-index',
    templateUrl: 'index.html',
    imports: [
        CoreSharedModule,
    ],
})
export default class CoreTagIndexPage implements OnInit {

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

    areas: CoreTagAreaDisplay[] = [];

    protected logView: () => void;

    constructor() {
        this.logView = CoreTime.once(async () => {
            const params = {
                tc: this.collectionId || undefined,
                tag: this.tagName || undefined,
                ta: this.areaId || undefined,
                from: this.fromContextId || undefined,
                ctx: this.contextId || undefined,
            };

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'core_tag_get_tagindex_per_area',
                name: this.tagName || Translate.instant('core.tag.tag'),
                data: { id: this.tagId || undefined, ...params, category: 'tag' },
                url: CoreUrl.addParamsToUrl('/tag/index.php', params),
            });
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.tagId = CoreNavigator.getRouteNumberParam('tagId') || this.tagId;
        this.tagName = CoreNavigator.getRouteParam('tagName') || this.tagName;
        this.collectionId = CoreNavigator.getRouteNumberParam('collectionId') || this.collectionId;
        this.areaId = CoreNavigator.getRouteNumberParam('areaId') || this.areaId;
        this.fromContextId = CoreNavigator.getRouteNumberParam('fromContextId') || this.fromContextId;
        this.contextId = CoreNavigator.getRouteNumberParam('contextId') || this.contextId;
        this.recursive = CoreNavigator.getRouteBooleanParam('recursive') ?? true;

        try {
            await this.fetchData();
            if (CoreScreen.isTablet && this.areas && this.areas.length > 0) {
                const area = this.areas.find((area) => area.id == this.areaId);
                this.openArea(area || this.areas[0]);
            }
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Fetch first page of tag index per area.
     *
     * @returns Resolved when done.
     */
    async fetchData(): Promise<void> {
        try {
            const areas = await CoreTag.getTagIndexPerArea(
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

            const areasDisplay: CoreTagAreaDisplay[] = [];

            await Promise.all(areas.map(async (area) => {
                const items = await CoreTagAreaDelegate.parseContent(area.component, area.itemtype, area.content);

                if (!items || !items.length) {
                    // Tag area not supported, skip.
                    this.hasUnsupportedAreas = true;

                    return;
                }

                areasDisplay.push({
                    id: area.ta,
                    componentName: area.component,
                    itemType: area.itemtype,
                    nameKey: CoreTagAreaDelegate.getDisplayNameKey(area.component, area.itemtype),
                    items,
                    canLoadMore: !!area.nextpageurl,
                    badge: items && items.length ? items.length + (area.nextpageurl ? '+' : '') : '',
                });
            }));

            this.areas = areasDisplay;

            this.logView();

        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error loading tag index' });
        }
    }

    /**
     * Refresh data.
     *
     * @param refresher Refresher.
     */
    refreshData(refresher?: HTMLIonRefresherElement): void {
        CoreTag.invalidateTagIndexPerArea(
            this.tagId,
            this.tagName,
            this.collectionId,
            this.areaId,
            this.fromContextId,
            this.contextId,
            this.recursive,
        ).finally(() => {
            this.fetchData().finally(() => {
                refresher?.complete();
            });
        });
    }

    /**
     * Navigate to an index area.
     *
     * @param area Area.
     */
    openArea(area: CoreTagAreaDisplay): void {
        if (area.id === this.selectedAreaId) {
            // Already opened.
            return;
        }

        if (CoreScreen.isTablet) {
            this.selectedAreaId = area.id;
        }

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

        const splitViewLoaded = CoreNavigator.isCurrentPathInTablet('**/tag/index/index-area');
        const path = (splitViewLoaded ? '../' : '') + 'index-area';

        CoreNavigator.navigate(path, { params });
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
