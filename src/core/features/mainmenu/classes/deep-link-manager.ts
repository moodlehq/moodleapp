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

import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreNavigationOptions, CoreNavigator, CoreRedirectPayload } from '@services/navigator';

/**
 * A class to handle opening deep links in a main menu page. There are 2 type of deep links:
 *   -A Moodle URL to treat.
 *   -A combination of path + options.
 */
export class CoreMainMenuDeepLinkManager {

    protected pendingRedirect?: CoreRedirectPayload;

    constructor() {
        const urlToOpen = CoreNavigator.getRouteParam('urlToOpen');
        const redirectPath = CoreNavigator.getRouteParam('redirectPath');
        if (urlToOpen || redirectPath) {
            this.pendingRedirect = {
                redirectPath,
                redirectOptions: CoreNavigator.getRouteParam('redirectOptions'),
                urlToOpen,
            };
        }
    }

    /**
     * Whether there is a deep link to be treated.
     *
     * @returns Whether there is a deep link to be treated.
     */
    hasDeepLinkToTreat(): boolean {
        return !!this.pendingRedirect?.urlToOpen || !!this.pendingRedirect?.redirectPath;
    }

    /**
     * Treat a deep link if there's any to treat.
     */
    async treatLink(): Promise<void> {
        const pendingRedirect = this.pendingRedirect;
        if (!pendingRedirect) {
            return;
        }

        delete this.pendingRedirect;
        if (pendingRedirect.redirectPath) {
            await this.treatPath(pendingRedirect.redirectPath, pendingRedirect.redirectOptions);
        } else if (pendingRedirect.urlToOpen) {
            await this.treatUrlToOpen(pendingRedirect.urlToOpen);
        }
    }

    /**
     * Open a path.
     *
     * @param path Path.
     * @param navOptions Navigation options.
     */
    protected async treatPath(path: string, navOptions: CoreNavigationOptions = {}): Promise<void> {
        const params = navOptions.params;
        const coursePathMatches = path.match(/^course\/(\d+)\/?$/);

        if (coursePathMatches) {
            if (!params?.course) {
                await CoreCourseHelper.getAndOpenCourse(Number(coursePathMatches[1]), params);
            } else {
                await CoreCourse.openCourse(params.course, navOptions);
            }
        } else {
            await CoreNavigator.navigateToSitePath(path, {
                ...navOptions,
                preferCurrentTab: false,
            });
        }
    }

    /**
     * Treat a URL to open.
     *
     * @param url URL to open.
     */
    protected async treatUrlToOpen(url: string): Promise<void> {
        const action = await CoreContentLinksHelper.getFirstValidActionFor(url);
        if (action?.sites?.[0]) {
            await action.action(action.sites[0]);
        }
    }

}
