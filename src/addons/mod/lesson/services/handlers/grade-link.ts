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

import { CoreContentLinksModuleGradeHandler } from '@features/contentlinks/classes/module-grade-handler';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { makeSingleton } from '@singletons';
import { AddonModLesson } from '../lesson';
import { AddonModLessonModuleHandlerService } from './module';

/**
 * Handler to treat links to lesson grade.
 */
@Injectable({ providedIn: 'root' })
export class AddonModLessonGradeLinkHandlerService extends CoreContentLinksModuleGradeHandler {

    name = 'AddonModLessonGradeLinkHandler';
    canReview = true;

    constructor() {
        super('AddonModLesson', 'lesson');
    }

    /**
     * Go to the page to review.
     *
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL.
     * @param siteId Site to use.
     * @return Promise resolved when done.
     */
    protected async goToReview(
        url: string,
        params: Record<string, unknown>,
        courseId: number,
        siteId: string,
    ): Promise<void> {
        const moduleId = Number(params.id);
        const userId = Number(params.userid) || 0;

        const modal = await CoreDomUtils.showModalLoading();

        try {
            const module = await CoreCourse.getModuleBasicInfo(moduleId, siteId);
            courseId = Number(module.course || courseId || params.courseid || params.cid);

            // Check if the user can see the user reports in the lesson.
            const accessInfo = await AddonModLesson.getAccessInformation(module.instance, { cmId: module.id, siteId });

            if (accessInfo.canviewreports) {
                // User can view reports, go to view the report.
                CoreNavigator.navigateToSitePath(
                    AddonModLessonModuleHandlerService.PAGE_NAME + `/${courseId}/${module.id}/user-retake/${userId}`,
                    {
                        siteId,
                    },
                );
            } else {
                // User cannot view the report, go to lesson index.
                CoreCourseHelper.navigateToModule(moduleId, siteId, courseId, module.section);
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);
        } finally {
            modal.dismiss();
        }
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async isEnabled(siteId: string, url: string, params: Record<string, string>, courseId?: number): Promise<boolean> {
        return AddonModLesson.isPluginEnabled(siteId);
    }

}

export const AddonModLessonGradeLinkHandler = makeSingleton(AddonModLessonGradeLinkHandlerService);
