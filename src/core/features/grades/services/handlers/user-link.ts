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

import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreGrades } from '@features/grades/services/grades';
import { CoreGradesHelper } from '@features/grades/services/grades-helper';
import { makeSingleton } from '@singletons';

/**
 * Handler to treat links to user grades.
 */
@Injectable({ providedIn: 'root' })
export class CoreGradesUserLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'CoreGradesUserLinkHandler';
    pattern = /\/grade\/report(\/user)?\/index.php/;

    /**
     * Get the list of actions for a link (url).
     *
     * @param siteIds List of sites the URL belongs to.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @param data Extra data to handle the URL.
     * @return List of (or promise resolved with list of) actions.
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Record<string, string>,
        courseId?: number,
        data?: { cmid?: string },
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        courseId = courseId || Number(params.id);
        data = data || {};

        return [{
            action: (siteId): void => {
                const userId = params.userid ? parseInt(params.userid, 10) : undefined;
                const moduleId = data?.cmid && parseInt(data.cmid, 10) || undefined;

                CoreGradesHelper.goToGrades(courseId!, userId, moduleId, siteId);
            },
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
    async isEnabled(siteId: string, url: string, params: Record<string, string>, courseId?: number): Promise<boolean> {
        if (!courseId && !params.id) {
            return false;
        }

        return CoreGrades.isPluginEnabledForCourse(courseId || Number(params.id), siteId);
    }

}

export const CoreGradesUserLinkHandler = makeSingleton(CoreGradesUserLinkHandlerService);
