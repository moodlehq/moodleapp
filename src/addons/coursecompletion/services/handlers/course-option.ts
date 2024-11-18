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
import { CoreCourseAccessDataType } from '@features/course/constants';
import {
    CoreCourseAccess,
    CoreCourseOptionsHandler,
    CoreCourseOptionsHandlerData,
} from '@features/course/services/course-options-delegate';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { makeSingleton } from '@singletons';
import { AddonCourseCompletion } from '../coursecompletion';

/**
 * Handler to inject an option into the course main menu.
 */
@Injectable({ providedIn: 'root' })
export class AddonCourseCompletionCourseOptionHandlerService implements CoreCourseOptionsHandler {

    name = 'AddonCourseCompletion';
    priority = 200;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return AddonCourseCompletion.isPluginViewEnabled();
    }

    /**
     * @inheritdoc
     */
    async isEnabledForCourse(courseId: number, accessData: CoreCourseAccess): Promise<boolean> {
        if (accessData && accessData.type === CoreCourseAccessDataType.ACCESS_GUEST) {
            return false; // Not enabled for guest access.
        }

        const courseEnabled = await AddonCourseCompletion.isPluginViewEnabledForCourse(courseId);
        // If is not enabled in the course, is not enabled for the user.
        if (!courseEnabled) {
            return false;
        }

        return AddonCourseCompletion.isPluginViewEnabledForUser(courseId);
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreCourseOptionsHandlerData | Promise<CoreCourseOptionsHandlerData> {
        return {
            title: 'addon.coursecompletion.completionmenuitem',
            class: 'addon-coursecompletion-course-handler',
            page: 'coursecompletion',
        };
    }

    /**
     * @inheritdoc
     */
    async invalidateEnabledForCourse(courseId: number): Promise<void> {
        await AddonCourseCompletion.invalidateCourseCompletion(courseId);
    }

    /**
     * @inheritdoc
     */
    async prefetch(course: CoreCourseAnyCourseData): Promise<void> {
        try {
            await AddonCourseCompletion.getCompletion(course.id, undefined, {
                getFromCache: false,
                emergencyCache: false,
            });
        } catch (error) {
            if (error && error.errorcode == 'notenroled') {
                // Not enrolled error, probably a teacher. Ignore error.
            } else {
                throw error;
            }
        }
    }

}
export const AddonCourseCompletionCourseOptionHandler = makeSingleton(AddonCourseCompletionCourseOptionHandlerService);
