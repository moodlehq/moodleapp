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
import { ActivatedRoute } from '@angular/router';

import { CoreApp } from '@services/app';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreTextUtils } from '@services/utils/text';
import { CoreTagCloud, CoreTagCollection, CoreTagCloudTag, CoreTag } from '@features/tag/services/tag';
import { Translate } from '@singletons';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';

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

    constructor(
        protected route: ActivatedRoute,
    ) {

    }

    /**
     * View loaded.
     */
    ngOnInit(): void {
        // @todo: Check params work.
        this.collectionId = this.route.snapshot.queryParamMap.has('collectionId') ?
            parseInt(this.route.snapshot.queryParamMap.get('collectionId')!, 10) : 0;
        this.query = this.route.snapshot.queryParamMap.get('query') || '';

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
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'Error loading tags.');
        }
    }

    /**
     * Fetch tag collections.
     *
     * @return Resolved when done.
     */
    async fetchCollections(): Promise<void> {
        const collections = await CoreTag.instance.getTagCollections();

        collections.forEach((collection) => {
            if (!collection.name && collection.isdefault) {
                collection.name = Translate.instance.instant('core.tag.defautltagcoll');
            }
        });

        this.collections = collections;
    }

    /**
     * Fetch tags.
     *
     * @return Resolved when done.
     */
    async fetchTags(): Promise<void> {
        this.cloud = await CoreTag.instance.getTagCloud(this.collectionId, undefined, undefined, this.query);
    }

    /**
     * Go to tag index page.
     */
    openTag(tag: CoreTagCloudTag): void {
        const url = CoreTextUtils.instance.decodeURI(tag.viewurl);
        CoreContentLinksHelper.instance.handleLink(url);
    }

    /**
     * Refresh data.
     *
     * @param refresher Refresher event.
     */
    refreshData(refresher?: CustomEvent<IonRefresher>): void {
        CoreUtils.instance.allPromises([
            CoreTag.instance.invalidateTagCollections(),
            CoreTag.instance.invalidateTagCloud(this.collectionId, undefined, undefined, this.query),
        ]).finally(() => this.fetchData().finally(() => {
            refresher?.detail.complete();
        }));
    }

    /**
     * Search tags.
     *
     * @param query Search query.
     * @return Resolved when done.
     */
    searchTags(query: string): Promise<void> {
        this.searching = true;
        this.query = query;
        CoreApp.instance.closeKeyboard();

        return this.fetchTags().catch((error) => {
            CoreDomUtils.instance.showErrorModalDefault(error, 'Error loading tags.');
        }).finally(() => {
            this.searching = false;
        });
    }

}
