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

import { Injectable, Type } from '@angular/core';
import { AddonModForum, AddonModForumTracking } from '../forum';
import { makeSingleton, Translate } from '@singletons';
import { CoreEvents } from '@static/events';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import {
    CoreCourseModuleHandler,
    CoreCourseModuleHandlerData,
    CoreCourseOverviewItemContent,
} from '@features/course/services/module-delegate';
import { CoreModuleHandlerBase } from '@features/course/classes/module-base-handler';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreText } from '@static/text';
import { CoreUser } from '@features/user/services/user';
import { ADDON_MOD_FORUM_MARK_READ_EVENT, ADDON_MOD_FORUM_MODNAME, ADDON_MOD_FORUM_PAGE_NAME } from '../../constants';
import { ModFeature, ModPurpose } from '@addons/mod/constants';
import { CoreCourseOverviewActivity, CoreCourseOverviewItem } from '@features/course/services/course-overview';

/**
 * Handler to support forum modules.
 */
@Injectable({ providedIn: 'root' })
export class AddonModForumModuleHandlerService extends CoreModuleHandlerBase implements CoreCourseModuleHandler {

    name = 'AddonModForum';
    modName = ADDON_MOD_FORUM_MODNAME;
    protected pageName = ADDON_MOD_FORUM_PAGE_NAME;

    supportedFeatures = {
        [ModFeature.GROUPS]: true,
        [ModFeature.GROUPINGS]: true,
        [ModFeature.MOD_INTRO]: true,
        [ModFeature.COMPLETION_TRACKS_VIEWS]: true,
        [ModFeature.COMPLETION_HAS_RULES]: true,
        [ModFeature.GRADE_HAS_GRADE]: true,
        [ModFeature.GRADE_OUTCOMES]: true,
        [ModFeature.RATE]: true,
        [ModFeature.BACKUP_MOODLE2]: true,
        [ModFeature.SHOW_DESCRIPTION]: true,
        [ModFeature.PLAGIARISM]: true,
        [ModFeature.ADVANCED_GRADING]: true,
        [ModFeature.MOD_PURPOSE]: ModPurpose.COLLABORATION,
        [ModFeature.CAN_UNINSTALL]: false,
    };

    /**
     * @inheritdoc
     */
    async getData(module: CoreCourseModuleData, courseId: number): Promise<CoreCourseModuleHandlerData> {
        const data = await super.getData(module, courseId);

        const customData = module.customdata ?
            CoreText.parseJSON<{ trackingtype?: string | number } | ''>(module.customdata, {}) : {};
        const trackingType = typeof customData !== 'string' && customData.trackingtype !== undefined ?
            Number(customData.trackingtype) : undefined;

        if (trackingType === AddonModForumTracking.OFF) {
            // Tracking is disabled in forum.
            data.extraBadge = '';

            return data;
        }

        if (trackingType === AddonModForumTracking.OPTIONAL) {
            // Forum has tracking optional, check if user has tracking enabled.
            const user = await CoreUser.getProfile(CoreSites.getCurrentSiteUserId());

            if (user.trackforums === 0) {
                data.extraBadge = '';

                return data;
            }
        }

        if ('afterlink' in module && !!module.afterlink) {
            const match = />(\d+)[^<]+/.exec(module.afterlink);
            data.extraBadge = match ? Translate.instant('addon.mod_forum.unreadpostsnumber', { $a : match[1] }) : '';
        } else {
            this.updateExtraBadge(data, courseId, module.id);
        }

        const event = CoreEvents.on(
            ADDON_MOD_FORUM_MARK_READ_EVENT,
            eventData => {
                if (eventData.courseId !== courseId || eventData.moduleId !== module.id) {
                    return;
                }

                this.updateExtraBadge(data, eventData.courseId, eventData.moduleId, eventData.siteId);
            },
            CoreSites.getCurrentSiteId(),
        );

        data.onDestroy = () => event.off();

        return data;
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown> | undefined> {
        const { AddonModForumIndexComponent } = await import('../../components/index');

        return AddonModForumIndexComponent;
    }

    /**
     * @inheritdoc
     */
    displayRefresherInSingleActivity(): boolean {
        return false;
    }

    /**
     * Triggers an update for the extra badge text.
     *
     * @param data Course Module Handler data.
     * @param courseId Course ID.
     * @param moduleId Course module ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async updateExtraBadge(data: CoreCourseModuleHandlerData, courseId: number, moduleId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (!siteId) {
            return;
        }

        data.extraBadge = Translate.instant('core.loading');

        try {
            // Handle unread posts.
            const forum = await AddonModForum.getForum(courseId, moduleId, {
                readingStrategy: CoreSitesReadingStrategy.PREFER_NETWORK,
                siteId,
            });

            data.extraBadge = forum.unreadpostscount
                ? Translate.instant(
                    'addon.mod_forum.unreadpostsnumber',
                    { $a : forum.unreadpostscount },
                )
                : '';
        } catch {
            // Ignore errors.
            data.extraBadge = '';
        }
    }

    /**
     * @inheritdoc
     */
    async getOverviewItemContent(
        item: CoreCourseOverviewItem,
        activity: CoreCourseOverviewActivity,
        courseId: number,
    ): Promise<CoreCourseOverviewItemContent | undefined> {
        // Hide the columns that are not supported for now.
        if (item.key === 'submitted' || item.key === 'subscribed' || item.key === 'emaildigest') {
            return {
                content: null,
            };
        }

        return super.getOverviewItemContent(item, activity, courseId);
    }

    /**
     * @inheritdoc
     */
    async getModuleForcedLang(module: CoreCourseModuleData): Promise<string | undefined> {
        const mod = await AddonModForum.getForum(
            module.course,
            module.id,
            { readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE },
        );

        return mod?.lang;
    }

}

export const AddonModForumModuleHandler = makeSingleton(AddonModForumModuleHandlerService);
