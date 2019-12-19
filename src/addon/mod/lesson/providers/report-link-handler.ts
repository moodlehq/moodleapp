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
import { NavController } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreContentLinksHandlerBase } from '@core/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@core/contentlinks/providers/delegate';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { AddonModLessonProvider } from './lesson';

/**
 * Handler to treat links to lesson report.
 */
@Injectable()
export class AddonModLessonReportLinkHandler extends CoreContentLinksHandlerBase {
    name = 'AddonModLessonReportLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModLesson';
    pattern = /\/mod\/lesson\/report\.php.*([\&\?]id=\d+)/;

    constructor(protected domUtils: CoreDomUtilsProvider, protected lessonProvider: AddonModLessonProvider,
            protected courseHelper: CoreCourseHelperProvider, protected linkHelper: CoreContentLinksHelperProvider,
            protected courseProvider: CoreCourseProvider) {
        super();
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
    getActions(siteIds: string[], url: string, params: any, courseId?: number):
            CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        courseId = courseId || params.courseid || params.cid;

        return [{
            action: (siteId, navCtrl?): void => {
                if (!params.action || params.action == 'reportoverview') {
                    // Go to overview.
                    this.openReportOverview(parseInt(params.id, 10), courseId, parseInt(params.group, 10), siteId, navCtrl);
                } else if (params.action == 'reportdetail') {
                    this.openUserRetake(parseInt(params.id, 10), parseInt(params.userid, 10), courseId, parseInt(params.try, 10),
                            siteId, navCtrl);
                }
            }
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
    isEnabled(siteId: string, url: string, params: any, courseId?: number): boolean | Promise<boolean> {
        if (params.action == 'reportdetail' && !params.userid) {
            // Individual details are only available if the teacher is seeing a certain user.
            return false;
        }

        return this.lessonProvider.isPluginEnabled();
    }

    /**
     * Open report overview.
     *
     * @param moduleId Module ID.
     * @param courseId Course ID.
     * @param groupId Group ID.
     * @param siteId Site ID.
     * @param navCtrl The NavController to use to navigate.
     * @return Promise resolved when done.
     */
    protected openReportOverview(moduleId: number, courseId?: number, groupId?: number, siteId?: string, navCtrl?: NavController)
            : Promise<any> {

        const modal = this.domUtils.showModalLoading();

        // Get the module object.
        return this.courseProvider.getModuleBasicInfo(moduleId, siteId).then((module) => {
            courseId = courseId || module.course;

            const pageParams = {
                module: module,
                courseId: Number(courseId),
                action: 'report',
                group: isNaN(groupId) ? null : groupId
            };

            this.linkHelper.goInSite(navCtrl, 'AddonModLessonIndexPage', pageParams, siteId);
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error processing link.');
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Open a user's retake.
     *
     * @param moduleId Module ID.
     * @param userId User ID.
     * @param courseId Course ID.
     * @param retake Retake to open.
     * @param groupId Group ID.
     * @param siteId Site ID.
     * @param navCtrl The NavController to use to navigate.
     * @return Promise resolved when done.
     */
    protected openUserRetake(moduleId: number, userId: number, courseId: number, retake: number, siteId: string,
            navCtrl?: NavController): Promise<any> {

        const modal = this.domUtils.showModalLoading();

        // Get the module object.
        return this.courseProvider.getModuleBasicInfo(moduleId, siteId).then((module) => {
            courseId = courseId || module.course;

            const pageParams = {
                lessonId: module.instance,
                courseId: Number(courseId),
                userId: userId,
                retake: retake || 0
            };

            this.linkHelper.goInSite(navCtrl, 'AddonModLessonUserRetakePage', pageParams, siteId);
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error processing link.');
        }).finally(() => {
            modal.dismiss();
        });
    }
}
