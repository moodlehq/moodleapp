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
import { NavController, NavOptions } from 'ionic-angular';
import { DomSanitizer } from '@angular/platform-browser';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@core/course/providers/module-delegate';
import { CoreAppProvider } from '@providers/app';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSitesProvider } from '@providers/sites';
import { AddonModLtiIndexComponent } from '../components/index/index';
import { AddonModLtiProvider } from './lti';
import { AddonModLtiHelper } from './helper';
import { CoreConstants } from '@core/constants';

/**
 * Handler to support LTI modules.
 */
@Injectable()
export class AddonModLtiModuleHandler implements CoreCourseModuleHandler {
    name = 'AddonModLti';
    modName = 'lti';

    supportedFeatures = {
        [CoreConstants.FEATURE_GROUPS]: false,
        [CoreConstants.FEATURE_GROUPINGS]: false,
        [CoreConstants.FEATURE_MOD_INTRO]: true,
        [CoreConstants.FEATURE_COMPLETION_TRACKS_VIEWS]: true,
        [CoreConstants.FEATURE_GRADE_HAS_GRADE]: true,
        [CoreConstants.FEATURE_GRADE_OUTCOMES]: true,
        [CoreConstants.FEATURE_BACKUP_MOODLE2]: true,
        [CoreConstants.FEATURE_SHOW_DESCRIPTION]: true
    };

    constructor(private appProvider: CoreAppProvider,
            private courseProvider: CoreCourseProvider,
            private filepoolProvider: CoreFilepoolProvider,
            private sitesProvider: CoreSitesProvider,
            private ltiProvider: AddonModLtiProvider,
            private sanitizer: DomSanitizer) {}

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Get the data required to display the module in the course contents view.
     *
     * @param module The module object.
     * @param courseId The course ID.
     * @param sectionId The section ID.
     * @return Data to render the module.
     */
    getData(module: any, courseId: number, sectionId: number): CoreCourseModuleHandlerData {
        const data: CoreCourseModuleHandlerData = {
            icon: this.courseProvider.getModuleIconSrc(this.modName, module.modicon),
            title: module.name,
            class: 'addon-mod_lti-handler',
            action(event: Event, navCtrl: NavController, module: any, courseId: number, options: NavOptions, params?: any): void {
                const pageParams = {module: module, courseId: courseId};
                if (params) {
                    Object.assign(pageParams, params);
                }
                navCtrl.push('AddonModLtiIndexPage', pageParams, options);
            },
            buttons: [{
                icon: 'link',
                label: 'addon.mod_lti.launchactivity',
                action: (event: Event, navCtrl: NavController, module: any, courseId: number): void => {
                    // Launch the LTI.
                    AddonModLtiHelper.instance.getDataAndLaunch(courseId, module);
                }
            }]
        };

        // Handle custom icons.
        this.ltiProvider.getLti(courseId, module.id).then((ltiData) => {
            const icon = ltiData.secureicon || ltiData.icon;
            if (icon) {
                const siteId = this.sitesProvider.getCurrentSiteId();
                this.filepoolProvider.downloadUrl(siteId,  icon, false, AddonModLtiProvider.COMPONENT, module.id).then(() => {
                    // Get the internal URL.
                    return this.filepoolProvider.getSrcByUrl(siteId, icon, AddonModLtiProvider.COMPONENT, module.id);
                }).then((url) => {
                    data.icon = this.sanitizer.bypassSecurityTrustUrl(url);
                }).catch(() => {
                    // Error downloading. If we're online we'll set the online url.
                    if (this.appProvider.isOnline()) {
                        data.icon = this.sanitizer.bypassSecurityTrustUrl(icon);
                    }
                });
            }
        }).catch(() => {
            // Ignore errors.
        });

        return data;
    }

    /**
     * Get the component to render the module. This is needed to support singleactivity course format.
     * The component returned must implement CoreCourseModuleMainComponent.
     *
     * @param course The course object.
     * @param module The module object.
     * @return The component to use, undefined if not found.
     */
    getMainComponent(course: any, module: any): any {
        return AddonModLtiIndexComponent;
    }
}
