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
import { Params } from '@angular/router';
import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreNavigator } from '@services/navigator';
import { makeSingleton } from '@singletons';
import { CoreCourses } from '../courses';
import { CoreCoursesMyCoursesHomeHandlerService } from './my-courses-home';

/**
 * Handler to treat links to course index (list of courses).
 */
@Injectable({ providedIn: 'root' })
export class CoreCoursesIndexLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'CoreCoursesIndexLinkHandler';
    featureName = 'CoreMainMenuDelegate_CoreCourses';
    pattern = /\/course\/?(index\.php.*)?$/;

    /**
     * Get the list of actions for a link (url).
     *
     * @param siteIds List of sites the URL belongs to.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @return List of (or promise resolved with list of) actions.
     */
    getActions(siteIds: string[], url: string, params: Params): CoreContentLinksAction[] {
        return [{
            action: (siteId): void => {
                let pageName = CoreCoursesMyCoursesHomeHandlerService.PAGE_NAME;

                if (CoreCourses.isGetCoursesByFieldAvailable()) {
                    if (params.categoryid) {
                        pageName += '/categories/' + params.categoryid;
                    } else {
                        pageName += '/all';
                    }
                } else {
                    // By default, go to My Courses.
                    pageName += '/my';
                }

                CoreNavigator.navigateToSitePath(pageName, { siteId });
            },
        }];
    }

}

export const CoreCoursesIndexLinkHandler = makeSingleton(CoreCoursesIndexLinkHandlerService);
