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
import { CoreCourse, CoreCourseAnyModuleData, CoreCourseWSModule } from '@features/course/services/course';
import { CoreCourseModule } from '@features/course/services/course-helper';
import { AddonModLesson } from '../lesson';
import { AddonModLessonIndexComponent } from '../../components/index';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { makeSingleton } from '@singletons';

/**
 * Handler to support quiz modules.
 */
@Injectable({ providedIn: 'root' })
export class AddonModLessonModuleHandlerService implements CoreCourseModuleHandler {

    static readonly PAGE_NAME = 'mod_lesson';

    name = 'AddonModLesson';
    modName = 'lesson';

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
    };

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return Promise resolved with boolean: whether or not the handler is enabled on a site level.
     */
    isEnabled(): Promise<boolean> {
        return AddonModLesson.isPluginEnabled();
    }

    /**
     * Get the data required to display the module in the course contents view.
     *
     * @param module The module object.
     * @param courseId The course ID.
     * @param sectionId The section ID.
     * @param forCoursePage Whether the data will be used to render the course page.
     * @return Data to render the module.
     */
    getData(
        module: CoreCourseAnyModuleData,
        courseId: number, // eslint-disable-line @typescript-eslint/no-unused-vars
        sectionId: number, // eslint-disable-line @typescript-eslint/no-unused-vars
        forCoursePage?: boolean, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): CoreCourseModuleHandlerData {
        return {
            icon: CoreCourse.getModuleIconSrc(this.modName, 'modicon' in module ? module.modicon : undefined),
            title: module.name,
            class: 'addon-mod_lesson-handler',
            showDownloadButton: true,
            action: (event: Event, module: CoreCourseModule, courseId: number, options?: CoreNavigationOptions) => {
                options = options || {};
                options.params = options.params || {};
                Object.assign(options.params, { module });
                const routeParams = '/' + courseId + '/' + module.id;

                CoreNavigator.navigateToSitePath(AddonModLessonModuleHandlerService.PAGE_NAME + routeParams, options);
            },
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getMainComponent(course: CoreCourseAnyCourseData, module: CoreCourseWSModule): Promise<Type<unknown> | undefined> {
        return AddonModLessonIndexComponent;
    }

}

export const AddonModLessonModuleHandler = makeSingleton(AddonModLessonModuleHandlerService);
