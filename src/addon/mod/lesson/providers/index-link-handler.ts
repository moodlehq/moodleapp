// (C) Copyright 2015 Martin Dougiamas
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
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreContentLinksModuleIndexHandler } from '@core/contentlinks/classes/module-index-handler';
import { CoreContentLinksAction } from '@core/contentlinks/providers/delegate';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { AddonModLessonProvider } from './lesson';

/**
 * Handler to treat links to lesson index.
 */
@Injectable()
export class AddonModLessonIndexLinkHandler extends CoreContentLinksModuleIndexHandler {
    name = 'AddonModLessonIndexLinkHandler';

    constructor(courseHelper: CoreCourseHelperProvider, protected lessonProvider: AddonModLessonProvider,
            protected domUtils: CoreDomUtilsProvider, protected courseProvider: CoreCourseProvider) {
        super(courseHelper, 'AddonModLesson', 'lesson');
    }

    /**
     * Get the list of actions for a link (url).
     *
     * @param {string[]} siteIds List of sites the URL belongs to.
     * @param {string} url The URL to treat.
     * @param {any} params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param {number} [courseId] Course ID related to the URL. Optional but recommended.
     * @return {CoreContentLinksAction[]|Promise<CoreContentLinksAction[]>} List of (or promise resolved with list of) actions.
     */
    getActions(siteIds: string[], url: string, params: any, courseId?: number):
            CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {

        courseId = courseId || params.courseid || params.cid;

        return [{
            action: (siteId, navCtrl?): void => {
                /* Ignore the pageid param. If we open the lesson player with a certain page and the user hasn't started
                   the lesson, an error is thrown: could not find lesson_timer records. */
                if (params.userpassword) {
                    this.navigateToModuleWithPassword(parseInt(params.id, 10), courseId, params.userpassword, siteId);
                } else {
                    this.courseHelper.navigateToModule(parseInt(params.id, 10), siteId, courseId);
                }
            }
        }];
    }

    /**
     * Check if the handler is enabled for a certain site (site + user) and a URL.
     * If not defined, defaults to true.
     *
     * @param {string} siteId The site ID.
     * @param {string} url The URL to treat.
     * @param {any} params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param {number} [courseId] Course ID related to the URL. Optional but recommended.
     * @return {boolean|Promise<boolean>} Whether the handler is enabled for the URL and site.
     */
    isEnabled(siteId: string, url: string, params: any, courseId?: number): boolean | Promise<boolean> {
        return this.lessonProvider.isPluginEnabled();
    }

    /**
     * Navigate to a lesson module (index page) with a fixed password.
     *
     * @param {number} moduleId Module ID.
     * @param {number} courseId Course ID.
     * @param {string} password Password.
     * @param {string} siteId Site ID.
     * @return {Promise<any>} Promise resolved when navigated.
     */
    protected navigateToModuleWithPassword(moduleId: number, courseId: number, password: string, siteId: string): Promise<any> {
        const modal = this.domUtils.showModalLoading();

        // Get the module.
        return this.courseProvider.getModuleBasicInfo(moduleId, siteId).then((module) => {
            courseId = courseId || module.course;

            // Store the password so it's automatically used.
            return this.lessonProvider.storePassword(parseInt(module.instance, 10), password, siteId).catch(() => {
                // Ignore errors.
            }).then(() => {
                return this.courseHelper.navigateToModule(moduleId, siteId, courseId, module.section);
            });
        }).catch(() => {
            // Error, go to index page.
            return this.courseHelper.navigateToModule(moduleId, siteId, courseId);
        }).finally(() => {
            modal.dismiss();
        });
    }
}
