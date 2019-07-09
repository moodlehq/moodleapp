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
import { NavController } from 'ionic-angular';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreContentLinksModuleGradeHandler } from '@core/contentlinks/classes/module-grade-handler';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { AddonModLessonProvider } from './lesson';

/**
 * Handler to treat links to lesson grade.
 */
@Injectable()
export class AddonModLessonGradeLinkHandler extends CoreContentLinksModuleGradeHandler {
    name = 'AddonModLessonGradeLinkHandler';
    canReview = true;

    constructor(courseHelper: CoreCourseHelperProvider, domUtils: CoreDomUtilsProvider, sitesProvider: CoreSitesProvider,
            protected lessonProvider: AddonModLessonProvider, protected courseProvider: CoreCourseProvider,
            protected linkHelper: CoreContentLinksHelperProvider) {
        super(courseHelper, domUtils, sitesProvider, 'AddonModLesson', 'lesson');
    }

    /**
     * Go to the page to review.
     *
     * @param {string} url The URL to treat.
     * @param {any} params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param {number} courseId Course ID related to the URL.
     * @param {string} siteId Site to use.
     * @param {NavController} [navCtrl] Nav Controller to use to navigate.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected goToReview(url: string, params: any, courseId: number, siteId: string, navCtrl?: NavController): Promise<any> {

        const moduleId = parseInt(params.id, 10),
            modal = this.domUtils.showModalLoading();
        let module;

        return this.courseProvider.getModuleBasicInfo(moduleId, siteId).then((mod) => {
            module = mod;
            courseId = module.course || courseId || params.courseid || params.cid;

            // Check if the user can see the user reports in the lesson.
            return this.lessonProvider.getAccessInformation(module.instance);
        }).then((info) => {
            if (info.canviewreports) {
                // User can view reports, go to view the report.
                const pageParams = {
                    courseId: Number(courseId),
                    lessonId: module.instance,
                    userId: parseInt(params.userid, 10)
                };

                this.linkHelper.goInSite(navCtrl, 'AddonModLessonUserRetakePage', pageParams, siteId);
            } else {
                // User cannot view the report, go to lesson index.
                this.courseHelper.navigateToModule(moduleId, siteId, courseId, module.section, undefined, undefined, navCtrl);
            }
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);
        }).finally(() => {
            modal.dismiss();
        });
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
}
