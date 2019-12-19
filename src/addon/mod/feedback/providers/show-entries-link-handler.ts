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
import { AddonModFeedbackProvider } from './feedback';
import { AddonModFeedbackHelperProvider } from './helper';

/**
 * Content links handler for feedback show entries questions.
 * Match mod/feedback/show_entries.php with a valid feedback id.
 */
@Injectable()
export class AddonModFeedbackShowEntriesLinkHandler extends CoreContentLinksHandlerBase {
    name = 'AddonModFeedbackShowEntriesLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModFeedback';
    pattern = /\/mod\/feedback\/show_entries\.php.*([\?\&](id|showcompleted)=\d+)/;

    constructor(private feedbackProvider: AddonModFeedbackProvider, private feedbackHelper: AddonModFeedbackHelperProvider) {
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
                this.feedbackHelper.handleShowEntriesLink(navCtrl, params, siteId);
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
        return this.feedbackProvider.isPluginEnabled(siteId).then((enabled) => {
            if (!enabled) {
                return false;
            }

            if (typeof params.id == 'undefined') {
                // Cannot treat the URL.
                return false;
            }

            return true;
        });
    }
}
