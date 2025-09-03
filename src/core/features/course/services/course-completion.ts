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
import { CoreSite } from '@classes/sites/site';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';

/**
 * Service that provides some features regarding a course completion.
 * This service only contains methods for course and not for activity completion.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseCompletionService {

    /**
     * Check whether completion is available in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @returns True if available.
     */
    isCompletionEnabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site && site.canUseAdvancedFeature('enablecompletion');
    }

    /**
     * Check whether completion is available in a certain course.
     *
     * @param course Course.
     * @param site Site. If not defined, use current site.
     * @returns True if available.
     */
    isCompletionEnabledInCourse(course: CoreCourseAnyCourseData, site?: CoreSite): boolean {
        if (!this.isCompletionEnabledInSite(site)) {
            return false;
        }

        return this.isCompletionEnabledInCourseObject(course);
    }

    /**
     * Check whether completion is enabled in a certain course object.
     *
     * @param course Course object.
     * @returns True if completion is enabled, false otherwise.
     */
    isCompletionEnabledInCourseObject(course: CoreCourseAnyCourseData): boolean {
        // Undefined means it's not supported, so it's enabled by default.
        return course.enablecompletion !== false;
    }

}
export const CoreCourseCompletion = makeSingleton(CoreCourseCompletionService);
