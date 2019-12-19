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
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreContentLinksHandlerBase } from '@core/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@core/contentlinks/providers/delegate';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';

/**
 * Handler to treat links to edit a wiki page.
 */
@Injectable()
export class AddonModWikiEditLinkHandler extends CoreContentLinksHandlerBase {
    name = 'AddonModWikiEditLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModWiki';
    pattern = /\/mod\/wiki\/edit\.php.*([\&\?]pageid=\d+)/;

    constructor(protected linkHelper: CoreContentLinksHelperProvider, protected textUtils: CoreTextUtilsProvider) {
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

        courseId = courseId || params.courseid || params.cid;

        return [{
            action: (siteId, navCtrl?): void => {

                let section = '';
                if (typeof params.section != 'undefined') {
                    section = params.section.replace(/\+/g, ' ');
                }

                const pageParams = {
                    courseId: courseId,
                    section: section,
                    pageId: parseInt(params.pageid, 10)
                };

                this.linkHelper.goInSite(navCtrl, 'AddonModWikiEditPage', pageParams, siteId);
            }
        }];
    }
}
