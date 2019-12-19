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

import { Injectable } from '@angular/core';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreContentLinksHandlerBase } from '@core/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@core/contentlinks/providers/delegate';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { AddonModGlossaryProvider } from './glossary';

/**
 * Handler to treat links to glossary entries.
 */
@Injectable()
export class AddonModGlossaryEntryLinkHandler extends CoreContentLinksHandlerBase {
    name = 'AddonModGlossaryEntryLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModGlossary';
    pattern = /\/mod\/glossary\/(showentry|view)\.php.*([\&\?](eid|g|mode|hook)=\d+)/;

    constructor(
            private domUtils: CoreDomUtilsProvider,
            private linkHelper: CoreContentLinksHelperProvider,
            private glossaryProvider: AddonModGlossaryProvider,
            private courseHelper: CoreCourseHelperProvider) {
        super();
    }

    /**
     * Get the list of actions for a link (url).
     *
     * @param siteIds List of sites the URL belongs to.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @return List of (or promise resolved with list of) actions.
     */
    getActions(siteIds: string[], url: string, params: any, courseId?: number):
            CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        return [{
            action: (siteId, navCtrl?): void => {
                const modal = this.domUtils.showModalLoading();
                let entryId;
                if (params.mode == 'entry') {
                    entryId = parseInt(params.hook, 10);
                } else {
                    entryId = parseInt(params.eid, 10);
                }

                let promise;

                if (courseId) {
                    promise = Promise.resolve(courseId);
                } else {
                    promise = this.glossaryProvider.getEntry(entryId, siteId).catch((error) => {
                        this.domUtils.showErrorModalDefault(error, 'addon.mod_glossary.errorloadingentry', true);

                        return Promise.reject(null);
                    }).then((response) => {
                        return this.courseHelper.getModuleCourseIdByInstance(response.entry.glossaryid, 'glossary', siteId);
                    });
                }

                return promise.then((courseId) => {
                    this.linkHelper.goInSite(navCtrl, 'AddonModGlossaryEntryPage', {courseId, entryId}, siteId);
                }).finally(() => {
                    modal.dismiss();
                });
            }
        }];
    }
}
