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
import { makeSingleton, Translate } from '@singletons';
import { CoreCourseNavigation, CoreCourseNavigationDirection } from '../course-navigation';
import { CoreCourse } from '../course';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreSitesReadingStrategy } from '@services/sites';
import { CorePromiseUtils } from '@static/promise-utils';

/**
 * Handler to treat links to activities next or previous.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseActivityNavigationLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'CoreCourseActivityNavigationLinkHandler';
    pattern = /\/course\/cms\/(\d+)\/(next|previous)/;

    /**
     * @inheritdoc
     */
    getActions(
        siteIds: string[],
        url: string,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        const search = url.match(this.pattern);
        if (!search) {
            return [];
        }

        const currentModuleId = Number(search[1]);
        const direction = search[2] as CoreCourseNavigationDirection;

        return [{
            action: async (siteId): Promise<void> => {
                // Get the module.
                const module = await CoreCourse.getModuleBasicInfo(
                    currentModuleId,
                    { siteId, readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE },
                );

                const modal = await CoreLoadings.show();
                const moduleToOpen = await CorePromiseUtils.ignoreErrors(CoreCourseNavigation.getNextOrPreviousModules(
                    module.course,
                    module.id,
                    direction,
                    {
                        readingStrategy: CoreSitesReadingStrategy.PREFER_NETWORK,
                        siteId,
                    },
                ));
                modal.dismiss();

                if (!moduleToOpen) {
                    // It seems the module was hidden. Show a message.
                    CoreAlerts.showError(
                        Translate.instant(direction === CoreCourseNavigationDirection.NEXT
                            ? 'core.course.nextactivitynotfound'
                            : 'core.course.previousactivitynotfound'),
                    );

                    return;
                }

                await CoreCourseNavigation.navigateToActivity(moduleToOpen, direction, false);
            },
        }];
    }

}
export const CoreCourseActivityNavigationLinkHandler = makeSingleton(CoreCourseActivityNavigationLinkHandlerService);
