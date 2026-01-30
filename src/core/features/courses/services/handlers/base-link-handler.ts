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

import { CoreLoadings } from '@services/overlays/loadings';
import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreCourses } from '../courses';
import { Params } from '@angular/router';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreNavigator } from '@services/navigator';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreSites } from '@services/sites';
import { CoreCourse } from '@features/course/services/course';

/**
 * Base handler to treat course links.
 */
export class CoreCoursesLinksHandlerBase extends CoreContentLinksHandlerBase {

    /**
     * Get actions to open course content.
     *
     * @param url URL to treat.
     * @param courseId Course ID.
     * @param pageParams Params to send to the new page.
     * @returns Promise resolved with the actions.
     */
    protected getCourseActions(url: string, courseId: number, pageParams: Params = {}): CoreContentLinksAction[] {
        return [{
            action: async (siteId): Promise<void> => {
                siteId = siteId || CoreSites.getCurrentSiteId();
                if (siteId === CoreSites.getCurrentSiteId()) {
                    // Check if we already are in the course index page.
                    if (CoreCourse.currentViewIsCourse(courseId)) {
                        // Current view is this course, just select the contents tab.
                        CoreCourse.selectCourseTab('', pageParams);

                        return;
                    }

                    await CorePromiseUtils.ignoreErrors(this.actionOpen(courseId, url, pageParams));

                    return;
                }

                // Make the course the new history root (to avoid "loops" in history).
                await CoreCourseHelper.getAndOpenCourse(courseId, pageParams, siteId);
            },
        }];
    }

    /**
     * Try to open the course, asking the user to enrol if needed.
     *
     * @param courseId Course ID.
     * @param url Treated URL.
     * @param pageParams Params to send to the new page.
     * @returns Promise resolved when done.
     */
    protected async actionOpen(courseId: number, url: string, pageParams: Params): Promise<void> {
        const isEnrolUrl = !!url.match(/(\/enrol\/index\.php)|(\/course\/enrol\.php)/);
        if (isEnrolUrl) {
            this.navigateCourseSummary(courseId, pageParams);

            return;
        }

        const modal = await CoreLoadings.show();

        // Check if user is enrolled in the course.
        const hasAccess = await CoreCourseHelper.userHasAccessToCourse(courseId);

        const guestInfo = await CoreCourseHelper.courseUsesGuestAccessInfo(courseId);
        pageParams.isGuest = guestInfo.guestAccess;

        if (hasAccess && !guestInfo.guestAccess && !guestInfo.requiresUserInput) {
            // Direct access.
            const course = await CorePromiseUtils.ignoreErrors(CoreCourses.getUserCourse(courseId), { id: courseId });

            CoreCourseHelper.openCourse(course, { params: pageParams });
        } else {
            this.navigateCourseSummary(courseId, pageParams);

        }

        modal.dismiss();
    }

    /**
     * Navigate course summary.
     *
     * @param courseId Course ID.
     * @param pageParams Params to send to the new page.
     */
    protected navigateCourseSummary(courseId: number, pageParams: Params): void {
        CoreNavigator.navigateToSitePath(
            `/course/${courseId}/summary`,
            { params: pageParams },
        );
    }

}
