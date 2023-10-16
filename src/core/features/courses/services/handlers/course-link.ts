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
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreCourses } from '../courses';
import { CoreLogger } from '@singletons/logger';
import { makeSingleton } from '@singletons';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { Params } from '@angular/router';
import { CoreUtils } from '@services/utils/utils';
import { CoreNavigator } from '@services/navigator';

/**
 * Handler to treat links to course view or enrol (except site home).
 */
@Injectable({ providedIn: 'root' })
export class CoreCoursesCourseLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'CoreCoursesCourseLinkHandler';
    pattern = /((\/enrol\/index\.php)|(\/course\/enrol\.php)|(\/course\/view\.php)).*([?&]id=\d+)/;

    protected waitStart = 0;
    protected logger: CoreLogger;

    constructor() {
        super();

        this.logger = CoreLogger.getInstance('CoreCoursesCourseLinkHandler');
    }

    /**
     * @inheritdoc
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Params,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        const courseId = parseInt(params.id, 10);
        const sectionId = params.sectionid ? parseInt(params.sectionid, 10) : undefined;
        const pageParams: Params = {
            sectionId: sectionId || undefined,
        };
        let sectionNumber = params.section !== undefined ? parseInt(params.section, 10) : NaN;

        if (!sectionId && !sectionNumber) {
            // Check if the URL has a hash to navigate to the section.
            const matches = url.match(/#section-(\d+)/);
            if (matches && matches[1]) {
                sectionNumber = parseInt(matches[1], 10);
            }
        }

        if (!isNaN(sectionNumber)) {
            pageParams.sectionNumber = sectionNumber;
        } else {
            const matches = url.match(/#inst(\d+)/);

            if (matches && matches[1]) {
                pageParams.blockInstanceId = parseInt(matches[1], 10);
            }
        }

        return [{
            action: (siteId): void => {
                siteId = siteId || CoreSites.getCurrentSiteId();
                if (siteId === CoreSites.getCurrentSiteId()) {
                    // Check if we already are in the course index page.
                    if (CoreCourse.currentViewIsCourse(courseId)) {
                        // Current view is this course, just select the contents tab.
                        CoreCourse.selectCourseTab('', pageParams);

                        return;
                    } else {
                        this.actionOpen(courseId, url, pageParams).catch(() => {
                            // Ignore errors.
                        });
                    }
                } else {
                    // Make the course the new history root (to avoid "loops" in history).
                    CoreCourseHelper.getAndOpenCourse(courseId, pageParams, siteId);
                }
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string, url: string, params: Params): Promise<boolean> {
        const courseId = parseInt(params.id, 10);

        if (!courseId) {
            return false;
        }

        // Get the course id of Site Home.
        return CoreSites.getSiteHomeId(siteId).then((siteHomeId) => courseId != siteHomeId);
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

        const modal = await CoreDomUtils.showModalLoading();

        // Check if user is enrolled in the course.
        const hasAccess = await CoreCourseHelper.userHasAccessToCourse(courseId);

        const guestInfo = await CoreCourseHelper.courseUsesGuestAccessInfo(courseId);
        pageParams.isGuest = guestInfo.guestAccess;

        if (hasAccess && !guestInfo.guestAccess && !guestInfo.requiresUserInput) {
            // Direct access.
            const course = await CoreUtils.ignoreErrors(CoreCourses.getUserCourse(courseId), { id: courseId });

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

export const CoreCoursesCourseLinkHandler = makeSingleton(CoreCoursesCourseLinkHandlerService);
