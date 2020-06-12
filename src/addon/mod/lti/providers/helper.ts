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
import { Platform } from 'ionic-angular';
import { CoreEvents, CoreEventsProvider } from '@providers/events';
import { CoreSites } from '@providers/sites';
import { CoreDomUtils } from '@providers/utils/dom';
import { CoreCourse } from '@core/course/providers/course';
import { AddonModLti, AddonModLtiLti } from './lti';

import { makeSingleton } from '@singletons/core.singletons';

/**
 * Service that provides some helper functions for LTI.
 */
@Injectable()
export class AddonModLtiHelperProvider {

    protected pendingCheckCompletion: {[moduleId: string]: {courseId: number, module: any}} = {};

    constructor(platform: Platform) {

        platform.resume.subscribe(() => {
            // User went back to the app, check pending completions.
            for (const moduleId in this.pendingCheckCompletion) {
                const data = this.pendingCheckCompletion[moduleId];

                CoreCourse.instance.checkModuleCompletion(data.courseId, data.module.completiondata);
            }
        });

        // Clear pending completion on logout.
        CoreEvents.instance.on(CoreEventsProvider.LOGOUT, () => {
            this.pendingCheckCompletion = {};
        });
    }

    /**
     * Get needed data and launch the LTI.
     *
     * @param courseId Course ID.
     * @param module Module.
     * @param lti LTI instance. If not provided it will be obtained.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async getDataAndLaunch(courseId: number, module: any, lti?: AddonModLtiLti, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        const modal = CoreDomUtils.instance.showModalLoading();

        try {
            const openInBrowser = await AddonModLti.instance.isOpenInAppBrowserDisabled(siteId);

            if (openInBrowser) {
                const site = await CoreSites.instance.getSite(siteId);

                // The view event is triggered by the browser, mark the module as pending to check completion.
                this.pendingCheckCompletion[module.id] = {
                    courseId,
                    module,
                };

                await site.openInBrowserWithAutoLogin(module.url);
            } else {
                // Open in app.
                if (!lti) {
                    lti = await AddonModLti.instance.getLti(courseId, module.id);
                }

                const launchData = await AddonModLti.instance.getLtiLaunchData(lti.id);

                // "View" LTI without blocking the UI.
                this.logViewAndCheckCompletion(courseId, module, lti.id, lti.name, siteId);

                // Launch LTI.
                return AddonModLti.instance.launch(launchData.endpoint, launchData.parameters);
            }
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'addon.mod_lti.errorgetlti', true);
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Report the LTI as being viewed and check completion.
     *
     * @param courseId Course ID.
     * @param module Module.
     * @param ltiId LTI id.
     * @param name Name of the lti.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async logViewAndCheckCompletion(courseId: number, module: any, ltiId: number, name?: string, siteId?: string): Promise<void> {
        try {
            await AddonModLti.instance.logView(ltiId, name);

            CoreCourse.instance.checkModuleCompletion(courseId, module.completiondata);
        } catch (error) {
            // Ignore errors.
        }
    }
}

export class AddonModLtiHelper extends makeSingleton(AddonModLtiHelperProvider) {}
