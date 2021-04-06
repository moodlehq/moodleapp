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
import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { makeSingleton } from '@singletons';

/**
 * Handler to treat links to edit a wiki page.
 */
@Injectable({ providedIn: 'root' })
export class AddonModWikiEditLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonModWikiEditLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModWiki';
    pattern = /\/mod\/wiki\/edit\.php.*([&?]pageid=\d+)/;

    /**
     * @inheritdoc
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Record<string, string>,
        courseId?: number,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        courseId = Number(courseId || params.courseid || params.cid);

        return [{
            action: (siteId: string) => {

                let section = '';
                if (typeof params.section != 'undefined') {
                    section = params.section.replace(/\+/g, ' ');
                }

                const pageParams = {
                    courseId: courseId,
                    section: section,
                    pageId: parseInt(params.pageid, 10),
                };

                // @todo this.linkHelper.goInSite(navCtrl, 'AddonModWikiEditPage', pageParams, siteId);
            },
        }];
    }

}

export const AddonModWikiEditLinkHandler = makeSingleton(AddonModWikiEditLinkHandlerService);
