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
     * @inheritdoc
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
        CoreCourseHelper.openCourse(course, { params: pageParams });
    }

    /**
     * Check if the user can self enrol or access the course.
     *
     * @param courseId Course ID.
     * @param url Treated URL.
     * @param modal Modal, to dismiss when needed.
     * @returns The course after self enrolling or undefined if the user has access but is not enrolled.
     */
    protected async checkSelfUserCanSelfEnrolOrAccess(
        courseId: number,
        url: string,
        modal: CoreIonLoadingElement,
    ): Promise<CoreEnrolledCourseData | undefined> {
        const isEnrolUrl = !!url.match(/(\/enrol\/index\.php)|(\/course\/enrol\.php)/);

        if (!isEnrolUrl) {
            // Not an enrol URL, check if the user can access the course (e.g. guest access).
            const canAccess = await this.canAccess(courseId);
            if (canAccess) {
                return;
            }
        }

        // User cannot access the course or it's an enrol URL. Check if can self enrol.
        const canSelfEnrol = await this.canSelfEnrol(courseId);

        if (!canSelfEnrol) {
            if (isEnrolUrl) {
                // Cannot self enrol, check if the user can access the course (e.g. guest access).
                const canAccess = await this.canAccess(courseId);
                if (canAccess) {
                    return;
                }
            }

            // Cannot self enrol and cannot access. Show error and allow the user to open the link in browser.
            modal.dismiss();
            const notEnrolledMessage = Translate.instant('core.courses.notenroled');
            const body = CoreTextUtils.buildSeveralParagraphsMessage(
                [notEnrolledMessage, Translate.instant('core.confirmopeninbrowser')],
            );

            try {
                await CoreDomUtils.showConfirm(body);

                CoreSites.getCurrentSite()?.openInBrowserWithAutoLogin(url, undefined, { showBrowserWarning: false });
            } catch {
                // User cancelled.
            }

            throw new CoreError(notEnrolledMessage);
        }

        // The user can self enrol. If it's not a enrolment URL we'll ask for confirmation.
        modal.dismiss();

        if (!isEnrolUrl) {
            await CoreDomUtils.showConfirm(Translate.instant('core.courses.confirmselfenrol'));
        }

        try {
            return await this.selfEnrol(courseId);
        } catch (error) {
            if (error) {
                CoreDomUtils.showErrorModal(error);
            }

            throw error;
        }
    }

    /**
     * Check if user can access the course.
     *
     * @param courseId Course ID.
     * @returns Promise resolved with boolean: whether user can access the course.
     */
    protected canAccess(courseId: number): Promise<boolean> {
        return CoreUtils.promiseWorks(CoreCourse.getSections(courseId, false, true));
    }

    /**
     * Check if a user can be "automatically" self enrolled in a course.
     *
     * @param courseId Course ID.
     * @returns Promise resolved with boolean: whether the user can be enrolled in a course.
     */
    protected async canSelfEnrol(courseId: number): Promise<boolean> {
        try {
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

            return isSelfEnrolEnabled && instances === 1;
        } catch {
            return false;
        }
    }

    /**
     * Try to self enrol a user in a course.
     *
     * @param courseId Course ID.
     * @param password Password.
     * @returns Promise resolved when the user is enrolled, rejected otherwise.
     */
    protected async selfEnrol(courseId: number, password?: string): Promise<CoreEnrolledCourseData | undefined> {
        const modal = await CoreDomUtils.showModalLoading();

        try {
            await CoreCourses.selfEnrol(courseId, password);

            try {
                // Sometimes the list of enrolled courses takes a while to be updated. Wait for it.
                return await this.waitForEnrolled(courseId, true);
            } finally {
                modal.dismiss();
            }
        } catch (error) {
            modal.dismiss();

            if (error && error.errorcode === CoreCoursesProvider.ENROL_INVALID_KEY) {
                // Invalid password. Allow the user to input password.
                const title = Translate.instant('core.courses.selfenrolment');
                let body = ' '; // Empty message.
                const placeholder = Translate.instant('core.courses.password');

                if (password !== undefined) {
                    // The user attempted a password. Show an error message.
                    body = CoreTextUtils.getErrorMessageFromError(error) || body;
                }

                password = await CoreDomUtils.showPrompt(body, title, placeholder);

                await this.selfEnrol(courseId, password);
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
     * @returns Promise resolved when enrolled or timeout.
     */
    protected async waitForEnrolled(courseId: number, first?: boolean): Promise<CoreEnrolledCourseData | undefined> {
        if (first) {
            this.waitStart = Date.now();
        }

        // Check if user is enrolled in the course.
        await CoreUtils.ignoreErrors(CoreCourses.invalidateUserCourses());
        try {
            return await CoreCourses.getUserCourse(courseId);
        } catch {
            // Not enrolled, wait a bit and try again.
            if (Date.now() - this.waitStart > 60000) {
                // Max time reached, stop.
                return;
            }

            await CoreUtils.wait(5000);

            return this.waitForEnrolled(courseId);
        }
    }

}

export const CoreCoursesCourseLinkHandler = makeSingleton(CoreCoursesCourseLinkHandlerService);
