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

import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreCourse } from '@features/course/services/course';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { makeSingleton } from '@singletons';
import { AddonModH5PActivity } from '../h5pactivity';
import { AddonModH5PActivityModuleHandlerService } from './module';

/**
 * Handler to treat links to H5P activity report.
 */
@Injectable({ providedIn: 'root' })
export class AddonModH5PActivityReportLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonModH5PActivityReportLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModH5PActivity';
    pattern = /\/mod\/h5pactivity\/report\.php.*([&?]a=\d+)/;

    /**
     * @inheritdoc
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Record<string, string>,
        courseId?: number,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        courseId = courseId || Number(params.courseid) || Number(params.cid);

        return [{
            action: async (siteId) => {
                try {
                    const instanceId = Number(params.a);

                    if (!courseId) {
                        courseId = await this.getCourseId(instanceId, siteId);
                    }

                    const module = await CoreCourse.getModuleBasicInfoByInstance(instanceId, 'h5pactivity', siteId);

                    if (typeof params.attemptid != 'undefined') {
                        this.openAttemptResults(module.id, Number(params.attemptid), courseId, siteId);
                    } else {
                        const userId = params.userid ? Number(params.userid) : undefined;

                        this.openUserAttempts(module.id, courseId, siteId, userId);
                    }
                } catch (error) {
                    CoreDomUtils.showErrorModalDefault(error, 'Error processing link.');
                }
            },
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
        const modal = await CoreDomUtils.showModalLoading();

        try {
            const module = await CoreCourse.getModuleBasicInfoByInstance(id, 'h5pactivity', siteId);

            return module.course;
        } finally {
            modal.dismiss();
        }
    }

    /**
     * @inheritdoc
     */
    isEnabled(): Promise<boolean> {
        return AddonModH5PActivity.isPluginEnabled();
    }

    /**
     * Open attempt results.
     *
     * @param cmId Module ID.
     * @param attemptId Attempt ID.
     * @param courseId Course ID.
     * @param siteId Site ID.
     * @return Promise resolved when done.
     */
    protected openAttemptResults(cmId: number, attemptId: number, courseId: number, siteId: string): void {
        const path = AddonModH5PActivityModuleHandlerService.PAGE_NAME + `/${courseId}/${cmId}/attemptresults/${attemptId}`;

        CoreNavigator.navigateToSitePath(path, {
            siteId,
        });
    }

    /**
     * Open user attempts.
     *
     * @param cmId Module ID.
     * @param courseId Course ID.
     * @param siteId Site ID.
     * @param userId User ID. If not defined, current user in site.
     * @return Promise resolved when done.
     */
    protected openUserAttempts(cmId: number, courseId: number, siteId: string, userId?: number): void {
        userId = userId || CoreSites.getCurrentSiteUserId();
        const path = AddonModH5PActivityModuleHandlerService.PAGE_NAME + `/${courseId}/${cmId}/userattempts/${userId}`;

        CoreNavigator.navigateToSitePath(path, {
            siteId,
        });
    }

}

export const AddonModH5PActivityReportLinkHandler = makeSingleton(AddonModH5PActivityReportLinkHandlerService);
