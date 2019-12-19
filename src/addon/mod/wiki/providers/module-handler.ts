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
import { AddonModWikiIndexComponent } from '../components/index/index';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@core/course/providers/module-delegate';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreConstants } from '@core/constants';

/**
 * Handler to support wiki modules.
 */
@Injectable()
export class AddonModWikiModuleHandler implements CoreCourseModuleHandler {
    name = 'AddonModWiki';
    modName = 'wiki';

    supportedFeatures = {
        [CoreConstants.FEATURE_GROUPS]: true,
        [CoreConstants.FEATURE_GROUPINGS]: true,
        [CoreConstants.FEATURE_MOD_INTRO]: true,
        [CoreConstants.FEATURE_COMPLETION_TRACKS_VIEWS]: true,
        [CoreConstants.FEATURE_GRADE_HAS_GRADE]: false,
        [CoreConstants.FEATURE_GRADE_OUTCOMES]: false,
        [CoreConstants.FEATURE_BACKUP_MOODLE2]: true,
        [CoreConstants.FEATURE_SHOW_DESCRIPTION]: true,
        [CoreConstants.FEATURE_RATE]: false,
        [CoreConstants.FEATURE_COMMENT]: true
    };

    constructor(private courseProvider: CoreCourseProvider) { }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean {
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
        return {
            icon: this.courseProvider.getModuleIconSrc(this.modName, module.modicon),
            title: module.name,
            class: 'addon-mod_wiki-handler',
            showDownloadButton: true,
            action(event: Event, navCtrl: NavController, module: any, courseId: number, options: NavOptions, params?: any): void {
                const pageParams = {module: module, courseId: courseId};
                if (params) {
                    Object.assign(pageParams, params);
                }
                navCtrl.push('AddonModWikiIndexPage', pageParams, options);
            }
        };
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
        return AddonModWikiIndexComponent;
    }
}
