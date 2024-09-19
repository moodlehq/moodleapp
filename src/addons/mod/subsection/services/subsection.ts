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
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';

/**
 * Service that provides some features for subsections.
 */
@Injectable({ providedIn: 'root' })
export class AddonModSubsectionProvider {

    /**
     * Open a subsection.
     *
     * @param sectionId Section ID.
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async openSubsection(sectionId: number, courseId: number, siteId?: string): Promise<void> {
        const pageParams = {
            sectionId,
        };

        if (
            (!siteId || siteId === CoreSites.getCurrentSiteId()) &&
            CoreCourse.currentViewIsCourse(courseId)
        ) {
            CoreCourse.selectCourseTab('', pageParams);
        } else {
            await CoreCourseHelper.getAndOpenCourse(courseId, pageParams, siteId);
        }
    }

}
export const AddonModSubsection = makeSingleton(AddonModSubsectionProvider);
