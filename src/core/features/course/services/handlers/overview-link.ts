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
import { makeSingleton } from '@singletons';
import { CoreSites } from '@services/sites';
import { CoreCourseOverview } from '../course-overview';

/**
 * Handler to treat links to activities overview.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseOverviewLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'CoreCourseOverviewLinkHandler';
    pattern = /\/course\/overview\.php.*([?&]id=)/;

    /**
     * @inheritdoc
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Record<string, string>,
        courseId?: number,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        courseId = courseId || Number(params.id);

        return [{
            action: async (siteId): Promise<void> => {
                const expand = params.expand?.split(',') || [];
                await CoreCourseOverview.navigateToCourseOverview(courseId, expand, undefined, siteId);
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string, url: string, params: Record<string, string>): Promise<boolean> {
        const courseId = Number(params.id);
        if (!courseId) {
            return false;
        }

        const site = await CoreSites.getSite(siteId);

        return CoreCourseOverview.canGetInformation(site);
    }

}

export const CoreCourseOverviewLinkHandler = makeSingleton(CoreCourseOverviewLinkHandlerService);
