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
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { AddonCourseCompletion } from '../coursecompletion';

/**
 * Handler to treat links to user course completion status.
 */
@Injectable({ providedIn: 'root' })
export class AddonCourseCompletionStatusLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonCourseCompletionStatusLinkHandler';
    pattern = /\/blocks\/completionstatus\/details\.php.*([?&](course|user)=\d+)/;

    /**
     * @inheritdoc
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Record<string, string>,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {

        return [{
            action: async (siteId): Promise<void> => {
                let userId = params.user ? parseInt(params.user, 10) : undefined;
                const courseId = parseInt(params.course, 10);
                if (!userId) {
                    const site = await CoreSites.getSite(siteId);
                    userId = site.getUserId();
                }

                const pageParams = {
                    courseId,
                    userId,
                };

                CoreNavigator.navigateToSitePath(
                    '/coursecompletion',
                    { params: pageParams, siteId },
                );
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string, url: string, params: Record<string, string>): Promise<boolean> {
        let userId = params.user ? parseInt(params.user, 10) : undefined;
        const courseId = parseInt(params.course, 10);
        if (!userId) {
            const site = await CoreSites.getSite(siteId);
            userId = site.getUserId();
        }

        return AddonCourseCompletion.isPluginViewEnabledForUser(courseId, userId, siteId);
    }

}

export const AddonCourseCompletionStatusLinkHandler = makeSingleton(AddonCourseCompletionStatusLinkHandlerService);
