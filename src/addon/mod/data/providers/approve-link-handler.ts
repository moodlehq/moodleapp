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
import { CoreContentLinksHandlerBase } from '@core/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@core/contentlinks/providers/delegate';
import { AddonModDataProvider } from './data';
import { AddonModDataHelperProvider } from './helper';

/**
 * Content links handler for database approve/disapprove entry.
 * Match mod/data/view.php?d=6&approve=5 with a valid data id and entryid.
 */
@Injectable()
export class AddonModDataApproveLinkHandler extends CoreContentLinksHandlerBase {
    name = 'AddonModDataApproveLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModData';
    pattern = /\/mod\/data\/view\.php.*([\?\&](d|approve|disapprove)=\d+)/;

    constructor(private dataProvider: AddonModDataProvider, private dataHelper: AddonModDataHelperProvider) {
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
                const dataId = parseInt(params.d, 10),
                    entryId = parseInt(params.approve, 10) || parseInt(params.disapprove, 10),
                    approve = parseInt(params.approve, 10) ? true : false;

                this.dataHelper.approveOrDisapproveEntry(dataId, entryId, approve, courseId, siteId);
            }
        }];
    }

    /**
     * Check if the handler is enabled for a certain site (site + user) and a URL.
     * If not defined, defaults to true.
     *
     * @param siteId The site ID.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @return Whether the handler is enabled for the URL and site.
     */
    isEnabled(siteId: string, url: string, params: any, courseId?: number): boolean | Promise<boolean> {
        if (typeof params.d == 'undefined' || (typeof params.approve == 'undefined' && typeof params.disapprove == 'undefined')) {
            // Required fields not defined. Cannot treat the URL.
            return false;
        }

        return this.dataProvider.isPluginEnabled(siteId);
    }
}
