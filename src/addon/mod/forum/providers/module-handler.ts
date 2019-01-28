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
import { NavController, NavOptions } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@core/course/providers/module-delegate';
import { CoreCourseProvider } from '@core/course/providers/course';
import { AddonModForumProvider } from './forum';
import { AddonModForumIndexComponent } from '../components/index/index';
import { CoreConstants } from '@core/constants';

/**
 * Handler to support forum modules.
 */
@Injectable()
export class AddonModForumModuleHandler implements CoreCourseModuleHandler {
    name = 'AddonModForum';
    modName = 'forum';

    supportedFeatures = {
        [CoreConstants.FEATURE_GROUPS]: true,
        [CoreConstants.FEATURE_GROUPINGS]: true,
        [CoreConstants.FEATURE_MOD_INTRO]: true,
        [CoreConstants.FEATURE_COMPLETION_TRACKS_VIEWS]: true,
        [CoreConstants.FEATURE_COMPLETION_HAS_RULES]: true,
        [CoreConstants.FEATURE_GRADE_HAS_GRADE]: true,
        [CoreConstants.FEATURE_GRADE_OUTCOMES]: true,
        [CoreConstants.FEATURE_BACKUP_MOODLE2]: true,
        [CoreConstants.FEATURE_SHOW_DESCRIPTION]: true,
        [CoreConstants.FEATURE_RATE]: true,
        [CoreConstants.FEATURE_PLAGIARISM]: true
    };

    constructor(private courseProvider: CoreCourseProvider, private forumProvider: AddonModForumProvider,
            private translate: TranslateService, private eventsProvider: CoreEventsProvider,
            private sitesProvider: CoreSitesProvider) {}

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return {boolean} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean {
        return true;
    }

    /**
     * Get the data required to display the module in the course contents view.
     *
     * @param {any} module The module object.
     * @param {number} courseId The course ID.
     * @param {number} sectionId The section ID.
     * @return {CoreCourseModuleHandlerData} Data to render the module.
     */
    getData(module: any, courseId: number, sectionId: number): CoreCourseModuleHandlerData {
        const data: CoreCourseModuleHandlerData = {
            icon: this.courseProvider.getModuleIconSrc(this.modName, module.modicon),
            title: module.name,
            class: 'addon-mod_forum-handler',
            showDownloadButton: true,
            action(event: Event, navCtrl: NavController, module: any, courseId: number, options: NavOptions, params?: any): void {
                const pageParams = {module: module, courseId: courseId};
                if (params) {
                    Object.assign(pageParams, params);
                }
                navCtrl.push('AddonModForumIndexPage', pageParams, options);
            }
        };

        if (typeof module.afterlink != 'undefined') {
            data.extraBadgeColor = '';
            const match = />(\d+)[^<]+/.exec(module.afterlink);
            data.extraBadge = match ? this.translate.instant('addon.mod_forum.unreadpostsnumber', {$a : match[1] }) : '';
        } else {
            this.updateExtraBadge(data, courseId, module.id);
        }

        const event = this.eventsProvider.on(AddonModForumProvider.MARK_READ_EVENT, (eventData) => {
            if (eventData.courseId == courseId && eventData.moduleId == module.id) {
                this.updateExtraBadge(data, eventData.courseId, eventData.moduleId, eventData.siteId);
            }
        }, this.sitesProvider.getCurrentSiteId());

        data.onDestroy = (): void => {
            event && event.off();
        };

        return data;
    }

    /**
     * Get the component to render the module. This is needed to support singleactivity course format.
     * The component returned must implement CoreCourseModuleMainComponent.
     *
     * @param {any} course The course object.
     * @param {any} module The module object.
     * @return {any} The component to use, undefined if not found.
     */
    getMainComponent(course: any, module: any): any {
        return AddonModForumIndexComponent;
    }

    /**
     * Whether to display the course refresher in single activity course format. If it returns false, a refresher must be
     * included in the template that calls the doRefresh method of the component. Defaults to true.
     *
     * @return {boolean} Whether the refresher should be displayed.
     */
    displayRefresherInSingleActivity(): boolean {
        return false;
    }

    /**
     * Triggers an update for the extra badge text.
     *
     * @param  {CoreCourseModuleHandlerData} data Course Module Handler data.
     * @param  {number} courseId Course ID.
     * @param  {number} moduleId Course module ID.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     */
    updateExtraBadge(data: CoreCourseModuleHandlerData, courseId: number, moduleId: number, siteId?: string): void {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        if (!siteId) {
            return;
        }

        data.extraBadge =  this.translate.instant('core.loading');
        data.extraBadgeColor = 'light';

        this.forumProvider.invalidateForumData(courseId).finally(() => {
            // Handle unread posts.
            this.forumProvider.getForum(courseId, moduleId, siteId).then((forumData) => {
                data.extraBadgeColor = '';
                data.extraBadge = forumData.unreadpostscount ? this.translate.instant('addon.mod_forum.unreadpostsnumber',
                    {$a : forumData.unreadpostscount }) : '';
            }).catch(() => {
                data.extraBadgeColor = '';
                data.extraBadge = '';
                // Ignore errors.
            });
        });
    }
}
