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

import { Injectable, Injector } from '@angular/core';
import { AddonCourseCompletionProvider } from './coursecompletion';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseOptionsHandler, CoreCourseOptionsHandlerData } from '@core/course/providers/options-delegate';
import { AddonCourseCompletionReportComponent } from '../components/report/report';

/**
 * Handler to inject an option into the course main menu.
 */
@Injectable()
export class AddonCourseCompletionCourseOptionHandler implements CoreCourseOptionsHandler {
    name = 'AddonCourseCompletion';
    priority = 200;

    constructor(private courseCompletionProvider: AddonCourseCompletionProvider) {}

    /**
     * Whether or not the handler is enabled on a site level.
     * @return Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.courseCompletionProvider.isPluginViewEnabled();
    }

    /**
     * Whether or not the handler is enabled for a certain course.
     *
     * @param courseId The course ID.
     * @param accessData Access type and data. Default, guest, ...
     * @param navOptions Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param admOptions Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return True or promise resolved with true if enabled.
     */
     isEnabledForCourse(courseId: number, accessData: any, navOptions?: any, admOptions?: any): boolean | Promise<boolean> {
        if (accessData && accessData.type == CoreCourseProvider.ACCESS_GUEST) {
            return false; // Not enabled for guests.
        }

        return this.courseCompletionProvider.isPluginViewEnabledForCourse(courseId).then((courseEnabled) => {
            // If is not enabled in the course, is not enabled for the user.
            if (!courseEnabled) {
                return false;
            }

            // Check if the user can see his own report, teachers can't.
            return this.courseCompletionProvider.isPluginViewEnabledForUser(courseId);
        });
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @param courseId The course ID.
     * @return Data.
     */
    getDisplayData?(injector: Injector, courseId: number): CoreCourseOptionsHandlerData {
        return {
            title: 'addon.coursecompletion.completionmenuitem',
            class: 'addon-coursecompletion-course-handler',
            component: AddonCourseCompletionReportComponent,
        };
    }

    /**
     * Should invalidate the data to determine if the handler is enabled for a certain course.
     *
     * @param courseId The course ID.
     * @param navOptions Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param admOptions Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return Promise resolved when done.
     */
    invalidateEnabledForCourse(courseId: number, navOptions?: any, admOptions?: any): Promise<any> {
        return this.courseCompletionProvider.invalidateCourseCompletion(courseId);
    }

    /**
     * Called when a course is downloaded. It should prefetch all the data to be able to see the addon in offline.
     *
     * @param course The course.
     * @return Promise resolved when done.
     */
    prefetch(course: any): Promise<any> {
        return this.courseCompletionProvider.getCompletion(course.id, undefined, {
            getFromCache: false,
            emergencyCache: false
        }).catch((error) => {
            if (error && error.errorcode == 'notenroled') {
                // Not enrolled error, probably a teacher. Ignore error.
            } else {
                return Promise.reject(error);
            }
        });
    }
}
