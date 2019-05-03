// (C) Copyright 2015 Martin Dougiamas
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
import { IonicPage, NavParams } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreRatingInfo } from '@core/rating/providers/rating';
import { AddonModGlossaryProvider } from '../../providers/glossary';

/**
 * Page that displays a glossary entry.
 */
@IonicPage({ segment: 'addon-mod-glossary-entry' })
@Component({
    selector: 'page-addon-mod-glossary-entry',
    templateUrl: 'entry.html',
})
export class AddonModGlossaryEntryPage {
    component = AddonModGlossaryProvider.COMPONENT;
    componentId: number;
    entry: any;
    glossary: any;
    loaded = false;
    showAuthor = false;
    showDate = false;
    ratingInfo: CoreRatingInfo;

    protected courseId: number;
    protected entryId: number;

    constructor(navParams: NavParams,
            private domUtils: CoreDomUtilsProvider,
            private glossaryProvider: AddonModGlossaryProvider) {
        this.courseId = navParams.get('courseId');
        this.entryId = navParams.get('entryId');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchEntry().then(() => {
            this.glossaryProvider.logEntryView(this.entry.id, this.componentId, this.glossary.name).catch(() => {
                // Ignore errors.
            });
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Refresh the data.
     *
     * @param {any} [refresher] Refresher.
     * @return {Promise<any>} Promise resolved when done.
     */
     doRefresh(refresher?: any): Promise<any> {
        return this.glossaryProvider.invalidateEntry(this.entry.id).catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.fetchEntry(true);
        }).finally(() => {
            refresher && refresher.complete();
        });
    }

    /**
     * Convenience function to get the glossary entry.
     *
     * @param {boolean} [refresh] Whether we're refreshing data.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchEntry(refresh?: boolean): Promise<any> {
        return this.glossaryProvider.getEntry(this.entryId).then((result) => {
            this.entry = result.entry;
            this.ratingInfo = result.ratinginfo;

            if (!refresh) {
                // Load the glossary.
                return this.glossaryProvider.getGlossaryById(this.courseId, this.entry.glossaryid).then((glossary) => {
                    this.glossary = glossary;
                    this.componentId = glossary.coursemodule;

                    switch (glossary.displayformat) {
                        case 'fullwithauthor':
                        case 'encyclopedia':
                            this.showAuthor = true;
                            this.showDate = true;
                            break;
                        case 'fullwithoutauthor':
                            this.showAuthor = false;
                            this.showDate = true;
                            break;
                        default: // Default, and faq, simple, entrylist, continuous.
                            this.showAuthor = false;
                            this.showDate = false;
                    }
                });
            }
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.mod_glossary.errorloadingentry', true);

            return Promise.reject(null);
        });
    }

    /**
     * Function called when rating is updated online.
     */
    ratingUpdated(): void {
        this.glossaryProvider.invalidateEntry(this.entryId);
    }
}
