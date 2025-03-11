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
import { CoreSitesReadingStrategy } from '@services/sites';
import { makeSingleton } from '@singletons';
import { ADDON_MOD_LESSON_FEATURE_NAME, ADDON_MOD_LESSON_PAGE_NAME } from '../../constants';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreAlerts } from '@services/overlays/alerts';

/**
 * Handler to treat links to lesson report.
 */
@Injectable({ providedIn: 'root' })
export class AddonModLessonReportLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonModLessonReportLinkHandler';
    featureName = ADDON_MOD_LESSON_FEATURE_NAME;
    pattern = /\/mod\/lesson\/report\.php.*([&?]id=\d+)/;

    /**
     * Get the list of actions for a link (url).
     *
     * @param siteIds List of sites the URL belongs to.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @returns List of (or promise resolved with list of) actions.
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Record<string, string>,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        return [{
            action: async (siteId) => {
                if (!params.action || params.action == 'reportoverview') {
                    // Go to overview.
                    await this.openReportOverview(Number(params.id), Number(params.group), siteId);
                } else if (params.action == 'reportdetail') {
                    await this.openUserRetake(Number(params.id), Number(params.userid), Number(params.try), siteId);
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
     * @returns Whether the handler is enabled for the URL and site.
     */
    async isEnabled(siteId: string, url: string, params: Record<string, string>): Promise<boolean> {
        if (params.action == 'reportdetail' && !params.userid) {
            // Individual details are only available if the teacher is seeing a certain user.
            return false;
        }

        return true;
    }

    /**
     * Open report overview.
     *
     * @param moduleId Module ID.
     * @param groupId Group ID.
     * @param siteId Site ID.
     * @returns Promise resolved when done.
     */
    protected async openReportOverview(moduleId: number, groupId?: number, siteId?: string): Promise<void> {

        const modal = await CoreLoadings.show();

        try {
            // Get the module object.
            const module = await CoreCourse.getModule(
                moduleId,
                undefined,
                undefined,
                false,
                false,
                siteId,
            );

            const params = {
                module,
                action: 'report',
                group: groupId === undefined || isNaN(groupId) ? null : groupId,
            };

            CoreNavigator.navigateToSitePath(
                `${ADDON_MOD_LESSON_PAGE_NAME}/${module.course}/${module.id}`,
                { params, siteId },
            );
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error processing link.' });
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Open a user's retake.
     *
     * @param moduleId Module ID.
     * @param userId User ID.
     * @param retake Retake to open.
     * @param siteId Site ID.
     * @returns Promise resolved when done.
     */
    protected async openUserRetake(
        moduleId: number,
        userId: number,
        retake: number,
        siteId: string,
    ): Promise<void> {

        const modal = await CoreLoadings.show();

        try {
            // Get the module object.
            const module = await CoreCourse.getModuleBasicInfo(
                moduleId,
                { siteId, readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE },
            );
            const params = {
                retake: retake || 0,
            };

            CoreNavigator.navigateToSitePath(
                `${ADDON_MOD_LESSON_PAGE_NAME}/${module.course}/${module.id}/user-retake/${userId}`,
                { params, siteId },
            );
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error processing link.' });
        } finally {
            modal.dismiss();
        }
    }

}

export const AddonModLessonReportLinkHandler = makeSingleton(AddonModLessonReportLinkHandlerService);
