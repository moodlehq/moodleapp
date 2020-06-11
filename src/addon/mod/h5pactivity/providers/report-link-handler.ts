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
import { CoreDomUtils } from '@providers/utils/dom';
import { CoreContentLinksHandlerBase } from '@core/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@core/contentlinks/providers/delegate';
import { CoreContentLinksHelper } from '@core/contentlinks/providers/helper';
import { CoreCourse } from '@core/course/providers/course';
import { AddonModH5PActivity } from './h5pactivity';

/**
 * Handler to treat links to H5P activity report.
 */
@Injectable()
export class AddonModH5PActivityReportLinkHandler extends CoreContentLinksHandlerBase {
    name = 'AddonModH5PActivityReportLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModH5PActivity';
    pattern = /\/mod\/h5pactivity\/report\.php.*([\&\?]a=\d+)/;

    constructor() {
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
            action: async (siteId, navCtrl?): Promise<void> => {
                try {
                    const id = Number(params.a);

                    if (!courseId) {
                        courseId = await this.getCourseId(id, siteId);
                    }

                    if (typeof params.attemptid != 'undefined') {
                        this.openAttemptResults(id, Number(params.attemptid), courseId, siteId, navCtrl);
                    } else {
                        const userId = params.userid ? Number(params.userid) : undefined;

                        this.openUserAttempts(id, courseId, siteId, userId, navCtrl);
                    }
                } catch (error) {
                    CoreDomUtils.instance.showErrorModalDefault(error, 'Error processing link.');
                }
            }
        }];
    }

    /**
     * Get course Id for an activity.
     *
     * @param id Activity ID.
     * @param siteId Site ID.
     * @return Promise resolved with course ID.
     */
    protected async getCourseId(id: number, siteId: string): Promise<number> {
        const modal = CoreDomUtils.instance.showModalLoading();

        try {
            const module = await CoreCourse.instance.getModuleBasicInfoByInstance(id, 'h5pactivity', siteId);

            return module.course;
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
    async isEnabled(siteId: string, url: string, params: any, courseId?: number): Promise<boolean> {
        return AddonModH5PActivity.instance.isPluginEnabled();
    }

    /**
     * Open attempt results.
     *
     * @param id Activity ID.
     * @param attemptId Attempt ID.
     * @param courseId Course ID.
     * @param siteId Site ID.
     * @param navCtrl The NavController to use to navigate.
     * @return Promise resolved when done.
     */
    protected openAttemptResults(id: number, attemptId: number, courseId: number, siteId: string, navCtrl?: NavController): void {

        const pageParams = {
            courseId: courseId,
            h5pActivityId: id,
            attemptId: attemptId,
        };

        CoreContentLinksHelper.instance.goInSite(navCtrl, 'AddonModH5PActivityAttemptResultsPage', pageParams, siteId);
    }

    /**
     * Open user attempts.
     *
     * @param id Activity ID.
     * @param courseId Course ID.
     * @param siteId Site ID.
     * @param userId User ID. If not defined, current user in site.
     * @param navCtrl The NavController to use to navigate.
     * @return Promise resolved when done.
     */
    protected openUserAttempts(id: number, courseId: number, siteId: string, userId?: number, navCtrl?: NavController): void {

        const pageParams = {
            courseId: courseId,
            h5pActivityId: id,
            userId: userId,
        };

        CoreContentLinksHelper.instance.goInSite(navCtrl, 'AddonModH5PActivityUserAttemptsPage', pageParams, siteId);
    }
}
