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

import { CoreConstants } from '@/core/constants';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { CoreCourse, CoreCourseAnyModuleData } from '@features/course/services/course';
import { CoreCourseModule } from '@features/course/services/course-helper';
import { CoreApp } from '@services/app';
import { CoreFilepool } from '@services/filepool';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { DomSanitizer, makeSingleton } from '@singletons';
import { AddonModLtiHelper } from '../lti-helper';
import { AddonModLti, AddonModLtiProvider } from '../lti';
import { AddonModLtiIndexComponent } from '../../components/index';

/**
 * Handler to support LTI modules.
 */
@Injectable({ providedIn: 'root' })
export class AddonModLtiModuleHandlerService implements CoreCourseModuleHandler {

    static readonly PAGE_NAME = 'mod_lti';

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
        [CoreConstants.FEATURE_SHOW_DESCRIPTION]: true,
    };

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    getData(
        module: CoreCourseAnyModuleData,
        courseId: number,
    ): CoreCourseModuleHandlerData {

        const data: CoreCourseModuleHandlerData = {
            icon: CoreCourse.getModuleIconSrc(this.modName, 'modicon' in module ? module.modicon : undefined),
            title: module.name,
            class: 'addon-mod_lti-handler',
            action(event: Event, module: CoreCourseModule, courseId: number, options?: CoreNavigationOptions): void {
                options = options || {};
                options.params = options.params || {};
                Object.assign(options.params, { module });
                const routeParams = '/' + courseId + '/' + module.id;

                CoreNavigator.navigateToSitePath(AddonModLtiModuleHandlerService.PAGE_NAME + routeParams, options);
            },
            buttons: [{
                icon: 'fas-external-link-alt',
                label: 'addon.mod_lti.launchactivity',
                action: (event: Event, module: CoreCourseModule, courseId: number): void => {
                    // Launch the LTI.
                    AddonModLtiHelper.getDataAndLaunch(courseId, module);
                },
            }],
        };

        // Handle custom icons.
        CoreUtils.ignoreErrors(this.loadCustomIcon(module, courseId, data));

        return data;
    }

    /**
     * Load the custom icon.
     *
     * @param module Module.
     * @param courseId Course ID.
     * @param data Handler data.
     * @return Promise resolved when done.
     */
    protected async loadCustomIcon(
        module: CoreCourseAnyModuleData,
        courseId: number,
        handlerData: CoreCourseModuleHandlerData,
    ): Promise<void> {
        const lti = await AddonModLti.getLti(courseId, module.id);

        const icon = lti.secureicon || lti.icon;
        if (!icon) {
            return;
        }

        const siteId = CoreSites.getCurrentSiteId();

        try {
            await CoreFilepool.downloadUrl(siteId, icon, false, AddonModLtiProvider.COMPONENT, module.id);

            // Get the internal URL.
            const url = await CoreFilepool.getSrcByUrl(siteId, icon, AddonModLtiProvider.COMPONENT, module.id);

            handlerData.icon = DomSanitizer.bypassSecurityTrustUrl(url);
        } catch {
            // Error downloading. If we're online we'll set the online url.
            if (CoreApp.isOnline()) {
                handlerData.icon = DomSanitizer.bypassSecurityTrustUrl(icon);
            }
        }
    }

    /**
     * @inheritdoc
     */
    async getMainComponent(): Promise<Type<unknown> | undefined> {
        return AddonModLtiIndexComponent;
    }

}

export const AddonModLtiModuleHandler = makeSingleton(AddonModLtiModuleHandlerService);
