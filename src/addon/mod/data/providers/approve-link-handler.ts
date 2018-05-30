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

import { Injectable } from '@angular/core';
import { CoreContentLinksHandlerBase } from '@core/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@core/contentlinks/providers/delegate';
import { AddonModDataProvider } from './data';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreEventsProvider } from '@providers/events';

/**
 * Content links handler for database approve/disapprove entry.
 * Match mod/data/view.php?d=6&approve=5 with a valid data id and entryid.
 */
@Injectable()
export class AddonModDataApproveLinkHandler extends CoreContentLinksHandlerBase {
    name = 'AddonModDataApproveLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModData';
    pattern = /\/mod\/data\/view\.php.*([\?\&](d|approve|disapprove)=\d+)/;

    constructor(private dataProvider: AddonModDataProvider, private courseProvider: CoreCourseProvider,
            private domUtils: CoreDomUtilsProvider, private eventsProvider: CoreEventsProvider) {
        super();
    }

    /**
     * Convenience function to help get courseId.
     *
     * @param {number} dataId   Database Id.
     * @param {string} siteId   Site Id, if not set, current site will be used.
     * @param {number} courseId Course Id if already set.
     * @return {Promise<number>}   Resolved with course Id when done.
     */
    protected getActivityCourseIdIfNotSet(dataId: number, siteId: string, courseId: number): Promise<number> {
        if (courseId) {
            return Promise.resolve(courseId);
        }

        return this.courseProvider.getModuleBasicInfoByInstance(dataId, 'data', siteId).then((module) => {
            return module.course;
        });
    }

    /**
     * Get the list of actions for a link (url).
     *
     * @param {string[]} siteIds List of sites the URL belongs to.
     * @param {string} url The URL to treat.
     * @param {any} params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param {number} [courseId] Course ID related to the URL. Optional but recommended.
     * @return {CoreContentLinksAction[]|Promise<CoreContentLinksAction[]>} List of (or promise resolved with list of) actions.
     */
    getActions(siteIds: string[], url: string, params: any, courseId?: number):
            CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        return [{
            action: (siteId, navCtrl?): void => {
                const modal = this.domUtils.showModalLoading(),
                    dataId = parseInt(params.d, 10),
                    entryId = parseInt(params.approve, 10) || parseInt(params.disapprove, 10),
                    approve = parseInt(params.approve, 10) ? true : false;

                this.getActivityCourseIdIfNotSet(dataId, siteId, courseId).then((cId) => {
                    courseId = cId;

                    // Approve/disapprove entry.
                    return this.dataProvider.approveEntry(dataId, entryId, approve, courseId, siteId).catch((message) => {
                        this.domUtils.showErrorModalDefault(message, 'addon.mod_data.errorapproving', true);

                        return Promise.reject(null);
                    });
                }).then(() => {
                    const promises = [];
                    promises.push(this.dataProvider.invalidateEntryData(dataId, entryId, siteId));
                    promises.push(this.dataProvider.invalidateEntriesData(dataId, siteId));

                    return Promise.all(promises);
                }).then(() => {
                    this.eventsProvider.trigger(AddonModDataProvider.ENTRY_CHANGED, {dataId: dataId, entryId: entryId}, siteId);

                    this.domUtils.showToast(approve ? 'addon.mod_data.recordapproved' : 'addon.mod_data.recorddisapproved', true,
                        3000);
                }).finally(() => {
                    modal.dismiss();
                });
            }
        }];
    }

    /**
     * Check if the handler is enabled for a certain site (site + user) and a URL.
     * If not defined, defaults to true.
     *
     * @param {string} siteId The site ID.
     * @param {string} url The URL to treat.
     * @param {any} params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param {number} [courseId] Course ID related to the URL. Optional but recommended.
     * @return {boolean|Promise<boolean>} Whether the handler is enabled for the URL and site.
     */
    isEnabled(siteId: string, url: string, params: any, courseId?: number): boolean | Promise<boolean> {
        if (typeof params.d == 'undefined' || (typeof params.approve == 'undefined' && typeof params.disapprove == 'undefined')) {
            // Required fields not defined. Cannot treat the URL.
            return false;
        }

        return this.dataProvider.isPluginEnabled(siteId);
    }
}
