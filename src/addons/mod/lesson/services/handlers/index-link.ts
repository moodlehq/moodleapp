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

import { CoreContentLinksModuleIndexHandler } from '@features/contentlinks/classes/module-index-handler';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { AddonModLesson } from '../lesson';

/**
 * Handler to treat links to lesson index.
 */
@Injectable({ providedIn: 'root' })
export class AddonModLessonIndexLinkHandlerService extends CoreContentLinksModuleIndexHandler {

    name = 'AddonModLessonIndexLinkHandler';

    constructor() {
        super('AddonModLesson', 'lesson');
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
        params: Record<string, string>,
        courseId?: number,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {

        courseId = Number(courseId || params.courseid || params.cid);

        return [{
            action: (siteId): void => {
                /* Ignore the pageid param. If we open the lesson player with a certain page and the user hasn't started
                   the lesson, an error is thrown: could not find lesson_timer records. */
                if (params.userpassword) {
                    this.navigateToModuleWithPassword(parseInt(params.id, 10), courseId!, params.userpassword, siteId);
                } else {
                    CoreCourseHelper.navigateToModule(parseInt(params.id, 10), siteId, courseId);
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isEnabled(siteId: string, url: string, params: Record<string, string>, courseId?: number): Promise<boolean> {
        return AddonModLesson.isPluginEnabled(siteId);
    }

    /**
     * Navigate to a lesson module (index page) with a fixed password.
     *
     * @param moduleId Module ID.
     * @param courseId Course ID.
     * @param password Password.
     * @param siteId Site ID.
     * @return Promise resolved when navigated.
     */
    protected async navigateToModuleWithPassword(
        moduleId: number,
        courseId: number,
        password: string,
        siteId: string,
    ): Promise<void> {
        const modal = await CoreDomUtils.showModalLoading();

        try {
            // Get the module.
            const module = await CoreCourse.getModuleBasicInfo(moduleId, siteId);

            courseId = courseId || module.course;

            // Store the password so it's automatically used.
            await CoreUtils.ignoreErrors(AddonModLesson.storePassword(module.instance, password, siteId));

            await CoreCourseHelper.navigateToModule(moduleId, siteId, courseId, module.section);
        } catch {
            // Error, go to index page.
            await CoreCourseHelper.navigateToModule(moduleId, siteId, courseId);
        } finally {
            modal.dismiss();
        }
    }

}

export const AddonModLessonIndexLinkHandler = makeSingleton(AddonModLessonIndexLinkHandlerService);
