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
import { makeSingleton } from '@singletons';
import { AddonCompetency } from '../competency';
import { CoreCourseAnyCourseData, CoreCourseUserAdminOrNavOptionIndexed } from '@features/courses/services/courses';
import { CoreFilterHelper } from '@features/filter/services/filter-helper';
import { ContextLevel } from '@/core/constants';
import { ADDON_COMPETENCY_COMPETENCIES_PAGE } from '@addons/competency/constants';

/**
 * Course nav handler.
 */
@Injectable( { providedIn: 'root' })
export class AddonCompetencyCourseOptionHandlerService implements CoreCourseOptionsHandler {

    name = 'AddonCompetency';
    priority = 300;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return AddonCompetency.areCompetenciesEnabled();
    }

    /**
     * @inheritdoc
     */
    async isEnabledForCourse(
        courseId: number,
        accessData: CoreCourseAccess,
        navOptions?: CoreCourseUserAdminOrNavOptionIndexed,
    ): Promise<boolean> {
        if (accessData && accessData.type === CoreCourseAccessDataType.ACCESS_GUEST) {
            return false; // Not enabled for guest access.
        }

        if (navOptions?.competencies !== undefined) {
            return navOptions.competencies;
        }

        try {
            const competencies = await AddonCompetency.getCourseCompetencies(courseId);

            return competencies ? !competencies.canmanagecoursecompetencies : false;
        } catch {
            return false;
        }
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreCourseOptionsHandlerData {
        return {
            title: 'addon.competency.competencies',
            class: 'addon-competency-course-handler',
            page: ADDON_COMPETENCY_COMPETENCIES_PAGE,
        };
    }

    /**
     * @inheritdoc
     */
    async invalidateEnabledForCourse(courseId: number, navOptions?: CoreCourseUserAdminOrNavOptionIndexed): Promise<void> {
        if (navOptions?.competencies !== undefined) {
            // No need to invalidate anything.
            return;
        }

        return AddonCompetency.invalidateCourseCompetencies(courseId);
    }

    /**
     * @inheritdoc
     */
    async prefetch(course: CoreCourseAnyCourseData): Promise<void> {
        // Get the competencies in the course.
        const competencies = await AddonCompetency.getCourseCompetencies(course.id, undefined, undefined, true);

        if (!competencies || !competencies.competencies) {
            return;
        }

        const promises: Promise<unknown>[] = [];

        // Prefetch all the competencies.
        competencies.competencies.forEach((competency) => {
            promises.push(AddonCompetency.getCompetencyInCourse(
                course.id,
                competency.competency.id,
                undefined,
                undefined,
                true,
            ));

            promises.push(AddonCompetency.getCompetencySummary(
                competency.competency.id,
                undefined,
                undefined,
                true,
            ));

            if (competency.coursemodules) {
                competency.coursemodules.forEach((module) => {
                    promises.push(CoreFilterHelper.getFilters(ContextLevel.MODULE, module.id, { courseId: course.id }));
                });
            }

            if (competency.plans) {
                competency.plans.forEach((plan) => {
                    promises.push(CoreFilterHelper.getFilters(ContextLevel.USER, plan.userid));
                });
            }
        });

        await Promise.all(promises);
    }

}
export const AddonCompetencyCourseOptionHandler = makeSingleton(AddonCompetencyCourseOptionHandlerService);
