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

import { Component } from '@angular/core';
import { IonicPage, NavParams, NavController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreTagProvider, CoreTagCloud, CoreTagCollection, CoreTagCloudTag } from '@core/tag/providers/tag';

/**
 * Page that displays most used tags and allows searching.
 */
@IonicPage({ segment: 'core-tag-search' })
@Component({
    selector: 'page-core-tag-search',
    templateUrl: 'search.html',
})
export class CoreTagSearchPage {
    collectionId: number;
    query: string;
    collections: CoreTagCollection[] = [];
    cloud: CoreTagCloud;
    loaded = false;
    searching = false;

    constructor(private navCtrl: NavController, navParams: NavParams, private appProvider: CoreAppProvider,
            private translate: TranslateService, private domUtils: CoreDomUtilsProvider, private utils: CoreUtilsProvider,
            private textUtils: CoreTextUtilsProvider, private contentLinksHelper: CoreContentLinksHelperProvider,
            private tagProvider: CoreTagProvider) {
        this.collectionId = navParams.get('collectionId') || 0;
        this.query = navParams.get('query') || '';
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchData().finally(() => {
            this.loaded = true;
        });
    }

    fetchData(): Promise<any> {
        return Promise.all([
            this.fetchCollections(),
            this.fetchTags()
        ]).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error loading tags.');
        });
    }

    /**
     * Fetch tag collections.
     *
     * @return Resolved when done.
     */
    fetchCollections(): Promise<any> {
        return this.tagProvider.getTagCollections().then((collections) => {
            collections.forEach((collection) => {
                if (!collection.name && collection.isdefault) {
                    collection.name = this.translate.instant('core.tag.defautltagcoll');
                }
            });
            this.collections = collections;
        });
    }

    /**
     * Fetch tags.
     *
     * @return Resolved when done.
     */
    fetchTags(): Promise<any> {
        return this.tagProvider.getTagCloud(this.collectionId, undefined, undefined, this.query).then((cloud) => {
            this.cloud = cloud;
        });
    }

    /**
     * Go to tag index page.
     */
    openTag(tag: CoreTagCloudTag): void {
        const url = this.textUtils.decodeURI(tag.viewurl);
        this.contentLinksHelper.handleLink(url, undefined, this.navCtrl);
    }

    /**
     * Refresh data.
     *
     * @param refresher Refresher.
     */
    refreshData(refresher: any): void {
        this.utils.allPromises([
            this.tagProvider.invalidateTagCollections(),
            this.tagProvider.invalidateTagCloud(this.collectionId, undefined, undefined, this.query),
        ]).finally(() => {
            return this.fetchData().finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * Search tags.
     *
     * @param query Search query.
     * @return Resolved when done.
     */
    searchTags(query: string): Promise<any> {
        this.searching = true;
        this.query = query;
        this.appProvider.closeKeyboard();

        return this.fetchTags().catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error loading tags.');
        }).finally(() => {
            this.searching = false;
        });
    }
}
