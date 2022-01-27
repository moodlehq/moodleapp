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

import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreNavigator, CoreRedirectPayload } from '@services/navigator';

/**
 * A class to handle opening deep links in a main menu page. There are 2 type of deep links:
 *   -A Moodle URL to treat.
 *   -A combination of path + options.
 */
export class CoreMainMenuDeepLinkManager {

    protected pendingRedirect?: CoreRedirectPayload;
    protected urlToOpen?: string;

    constructor() {
        this.urlToOpen = CoreNavigator.getRouteParam('urlToOpen');
        const redirectPath = CoreNavigator.getRouteParam('redirectPath');
        if (redirectPath) {
            this.pendingRedirect = {
                redirectPath,
                redirectOptions: CoreNavigator.getRouteParam('redirectOptions'),
            };
        }
    }

    /**
     * Whether there is a deep link to be treated.
     *
     * @return Whether there is a deep link to be treated.
     */
    hasDeepLinkToTreat(): boolean {
        return !!this.urlToOpen || !!this.pendingRedirect;
    }

    /**
     * Treat a deep link if there's any to treat.
     */
    treatLink(): void {
        if (this.pendingRedirect) {
            this.treatRedirect(this.pendingRedirect);
        } else if (this.urlToOpen) {
            this.treatUrlToOpen(this.urlToOpen);
        }

        delete this.pendingRedirect;
        delete this.urlToOpen;
    }

    /**
     * Treat a redirect.
     *
     * @param data Data received.
     */
    protected treatRedirect(data: CoreRedirectPayload): void {
        const params = data.redirectOptions?.params;
        const coursePathMatches = data.redirectPath.match(/^course\/(\d+)\/?$/);

        if (coursePathMatches) {
            if (!params?.course) {
                CoreCourseHelper.getAndOpenCourse(Number(coursePathMatches[1]), params);
            } else {
                CoreCourse.openCourse(params.course, params);
            }
        } else {
            CoreNavigator.navigateToSitePath(data.redirectPath, {
                ...data.redirectOptions,
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
        const actions = await CoreContentLinksDelegate.getActionsFor(url, undefined);

        const action = CoreContentLinksHelper.getFirstValidAction(actions);
        if (action?.sites?.[0]) {
            action.action(action.sites[0]);
        }
    }

}
