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
import { CoreCourseAnyCourseData, CoreCourses, CoreCoursesProvider, CoreEnrolledCourseData } from '../courses';
import { CoreLogger } from '@singletons/logger';
import { makeSingleton, Translate } from '@singletons';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { Params } from '@angular/router';
import { CoreError } from '@classes/errors/error';
import { CoreUtils } from '@services/utils/utils';
import { CoreTextUtils } from '@services/utils/text';
import { CoreIonLoadingElement } from '@classes/ion-loading';

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
     * Get the list of actions for a link (url).
     *
     * @param siteIds List of sites the URL belongs to.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @return List of (or promise resolved with list of) actions.
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Params,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        const courseId = parseInt(params.id, 10);
        const sectionId = params.sectionid ? parseInt(params.sectionid, 10) : null;
        const pageParams: Params = {
            sectionId: sectionId || null,
        };
        let sectionNumber = typeof params.section != 'undefined' ? parseInt(params.section, 10) : NaN;

        if (!sectionId && !sectionNumber) {
            // Check if the URL has a hash to navigate to the section.
            const matches = url.match(/#section-(\d+)/);
            if (matches && matches[1]) {
                sectionNumber = parseInt(matches[1], 10);
            }
        }

        if (!isNaN(sectionNumber)) {
            pageParams.sectionNumber = sectionNumber;
        }

        return [{
            action: (siteId): void => {
                siteId = siteId || CoreSites.getCurrentSiteId();
                if (siteId == CoreSites.getCurrentSiteId()) {
                    // Check if we already are in the course index page.
                    if (CoreCourse.currentViewIsCourse(courseId)) {
                        // Current view is this course, just select the contents tab.
                        CoreCourse.selectCourseTab('', pageParams);

                        return;
                    } else {
                        this.actionEnrol(courseId, url, pageParams).catch(() => {
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
     * Check if the handler is enabled for a certain site (site + user) and a URL.
     * If not defined, defaults to true.
     *
     * @param siteId The site ID.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @return Whether the handler is enabled for the URL and site.
     */
    async isEnabled(siteId: string, url: string, params: Params, courseId?: number): Promise<boolean> {
        courseId = parseInt(params.id, 10);

        if (!courseId) {
            return false;
        }

        // Get the course id of Site Home.
        return CoreSites.getSiteHomeId(siteId).then((siteHomeId) => courseId != siteHomeId);
    }

    /**
     * Action to perform when an enrol link is clicked.
     *
     * @param courseId Course ID.
     * @param url Treated URL.
     * @param pageParams Params to send to the new page.
     * @return Promise resolved when done.
     */
    protected async actionEnrol(courseId: number, url: string, pageParams: Params): Promise<void> {
        const modal = await CoreDomUtils.showModalLoading();
        let course: CoreCourseAnyCourseData | { id: number } | undefined;

        // Check if user is enrolled in the course.
        try {
            course = await CoreCourses.getUserCourse(courseId);
        } catch {
            course = await this.checkSelfUserCanSelfEnrolOrAccess(courseId, url, modal);
        }

        // Check if we need to retrieve the course.
        if (!course) {
            try {
                const data = await CoreCourseHelper.getCourse(courseId);
                course = data.course;
            } catch {
                // Cannot get course, return a "fake".
                course = { id: courseId };
            }
        }

        modal.dismiss();

        // Now open the course.
        CoreCourseHelper.openCourse(course, pageParams);
    }

    /**
     * Check if the user can self enrol or access the course.
     *
     * @param courseId Course ID.
     * @param url Treated URL.
     * @param modal Modal, to dismiss when needed.
     * @return The course after self enrolling or undefined if the user has access but is not enrolled.
     */
    protected checkSelfUserCanSelfEnrolOrAccess(
        courseId: number,
        url: string,
        modal: CoreIonLoadingElement,
    ): Promise<CoreEnrolledCourseData | undefined> {
        // User is not enrolled in the course. Check if can self enrol.
        return this.canSelfEnrol(courseId).then(async () => {
            modal.dismiss();

            const isEnrolUrl = !!url.match(/(\/enrol\/index\.php)|(\/course\/enrol\.php)/);

            // The user can self enrol. If it's not a enrolment URL we'll ask for confirmation.
            if (!isEnrolUrl) {
                try {
                    await CoreDomUtils.showConfirm(Translate.instant('core.courses.confirmselfenrol'));
                } catch {
                    // User cancelled. Check if the user can view the course contents (guest access or similar).
                    await CoreCourse.getSections(courseId, false, true);

                    return;
                }
            }

            // Enrol URL or user confirmed.
            try {
                return this.selfEnrol(courseId);
            } catch (error) {
                if (error) {
                    CoreDomUtils.showErrorModal(error);
                }

                throw error;
            }
        }, async (error) => {
            // Can't self enrol. Check if the user can view the course contents (guest access or similar).
            try {
                await CoreCourse.getSections(courseId, false, true);
            } catch {
                // Error. Show error message and allow the user to open the link in browser.
                modal.dismiss();

                if (error) {
                    error = CoreTextUtils.getErrorMessageFromError(error) || error;
                }
                if (!error) {
                    error = Translate.instant('core.courses.notenroled');
                }

                const body = CoreTextUtils.buildSeveralParagraphsMessage(
                    [error, Translate.instant('core.confirmopeninbrowser')],
                );

                try {
                    await CoreDomUtils.showConfirm(body);

                    CoreSites.getCurrentSite()?.openInBrowserWithAutoLogin(url);
                } catch {
                    // User cancelled.
                };

                throw error;
            }

            return undefined;
        });
    }

    /**
     * Check if a user can be "automatically" self enrolled in a course.
     *
     * @param courseId Course ID.
     * @return Promise resolved if user can be enrolled in a course, rejected otherwise.
     */
    protected async canSelfEnrol(courseId: number): Promise<void> {
        // Check that the course has self enrolment enabled.

        const methods = await CoreCourses.getCourseEnrolmentMethods(courseId);
        let isSelfEnrolEnabled = false;
        let instances = 0;
        methods.forEach((method) => {
            if (method.type == 'self' && method.status) {
                isSelfEnrolEnabled = true;
                instances++;
            }
        });

        if (!isSelfEnrolEnabled || instances != 1) {
            // Self enrol not enabled or more than one instance.
            throw new CoreError('Self enrol not enabled in course');
        }
    }

    /**
     * Try to self enrol a user in a course.
     *
     * @param courseId Course ID.
     * @param password Password.
     * @return Promise resolved when the user is enrolled, rejected otherwise.
     */
    protected async selfEnrol(courseId: number, password?: string): Promise<CoreEnrolledCourseData | undefined> {
        const modal = await CoreDomUtils.showModalLoading();

        try {
            await CoreCourses.selfEnrol(courseId, password);

            // Success self enrolling the user, invalidate the courses list.
            await CoreUtils.ignoreErrors(CoreCourses.invalidateUserCourses());

            try {
                // Sometimes the list of enrolled courses takes a while to be updated. Wait for it.
                return this.waitForEnrolled(courseId, true);
            } finally {
                modal.dismiss();
            }
        } catch (error) {
            modal.dismiss();

            if (error && error.code === CoreCoursesProvider.ENROL_INVALID_KEY) {
                // Invalid password. Allow the user to input password.
                const title = Translate.instant('core.courses.selfenrolment');
                const body = ' '; // Empty message.
                const placeholder = Translate.instant('core.courses.password');

                if (typeof password != 'undefined') {
                    // The user attempted a password. Show an error message.
                    CoreDomUtils.showErrorModal(error);
                }

                password = await CoreDomUtils.showPrompt(body, title, placeholder);

                return this.selfEnrol(courseId, password);
            } else {
                throw error;
            }
        }
    }

    /**
     * Wait for the user to be enrolled in a course.
     *
     * @param courseId The course ID.
     * @param first If it's the first call (true) or it's a recursive call (false).
     * @return Promise resolved when enrolled or timeout.
     */
    protected async waitForEnrolled(courseId: number, first?: boolean): Promise<CoreEnrolledCourseData | undefined> {
        if (first) {
            this.waitStart = Date.now();
        }

        // Check if user is enrolled in the course.
        await CoreUtils.ignoreErrors(CoreCourses.invalidateUserCourses());
        try {
            return CoreCourses.getUserCourse(courseId);
        } catch {

            // Not enrolled, wait a bit and try again.
            if (Date.now() - this.waitStart > 60000) {
                // Max time reached, stop.
                return;
            }

            return new Promise((resolve, reject): void => {
                setTimeout(() => {
                    this.waitForEnrolled(courseId)
                        .then(resolve).catch(reject);
                }, 5000);
            });
        }
    }

}

export const CoreCoursesCourseLinkHandler = makeSingleton(CoreCoursesCourseLinkHandlerService);
