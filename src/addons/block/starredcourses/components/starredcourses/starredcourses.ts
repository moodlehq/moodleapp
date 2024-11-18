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

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreCoursesMyCoursesUpdatedEventData, CoreCourses } from '@features/courses/services/courses';
import {
    CoreCourseSearchedDataWithExtraInfoAndOptions,
    CoreEnrolledCourseDataWithOptions,
} from '@features/courses/services/courses-helper';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { AddonCourseCompletion } from '@addons/coursecompletion/services/coursecompletion';
import { CoreBlockBaseComponent } from '@features/block/classes/base-block-component';
import { CoreUtils } from '@singletons/utils';
import { CoreSite } from '@classes/sites/site';
import { AddonBlockStarredCourse, AddonBlockStarredCourses } from '../../services/starredcourses';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCoursesComponentsModule } from '@features/courses/components/components.module';
import {
    CORE_COURSES_MY_COURSES_UPDATED_EVENT,
    CoreCoursesMyCoursesUpdatedEventAction,
    CORE_COURSES_STATE_FAVOURITE,
} from '@features/courses/constants';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Component to render a starred courses block.
 */
@Component({
    selector: 'addon-block-starredcourses',
    templateUrl: 'addon-block-starredcourses.html',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreCoursesComponentsModule,
    ],
})
export class AddonBlockStarredCoursesComponent extends CoreBlockBaseComponent implements OnInit, OnDestroy {

    courses: AddonBlockStarredCoursesCourse[] = [];

    scrollElementId!: string;

    protected site: CoreSite;
    protected isDestroyed = false;
    protected coursesObserver?: CoreEventObserver;
    protected fetchContentDefaultError = 'Error getting starred courses data.';

    constructor() {
        super('AddonBlockStarredCoursesComponent');

        this.site = CoreSites.getRequiredCurrentSite();
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        // Generate unique id for scroll element.
        const scrollId = CoreUtils.getUniqueId('AddonBlockStarredCoursesComponent-Scroll');

        this.scrollElementId = `addon-block-starredcourses-scroll-${scrollId}`;

        this.coursesObserver = CoreEvents.on(
            CORE_COURSES_MY_COURSES_UPDATED_EVENT,
            (data) => {
                this.refreshCourseList(data);
            },

            CoreSites.getCurrentSiteId(),
        );

        super.ngOnInit();
    }

    /**
     * @inheritdoc
     */
    async invalidateContent(): Promise<void> {
        const courseIds = this.courses.map((course) => course.id);

        await this.invalidateCourses(courseIds);
    }

    /**
     * Invalidate list of courses.
     *
     * @returns Promise resolved when done.
     */
    protected async invalidateCourseList(): Promise<void> {
        return AddonBlockStarredCourses.invalidateStarredCourses();
    }

    /**
     * Helper function to invalidate only selected courses.
     *
     * @param courseIds Course Id array.
     * @returns Promise resolved when done.
     */
    protected async invalidateCourses(courseIds: number[]): Promise<void> {
        const promises: Promise<void>[] = [];

        // Invalidate course completion data.
        promises.push(this.invalidateCourseList().finally(() =>
            CorePromiseUtils.allPromises(courseIds.map((courseId) =>
                AddonCourseCompletion.invalidateCourseCompletion(courseId)))));

        if (courseIds.length  == 1) {
            promises.push(CoreCourseOptionsDelegate.clearAndInvalidateCoursesOptions(courseIds[0]));
        } else {
            promises.push(CoreCourseOptionsDelegate.clearAndInvalidateCoursesOptions());
        }
        if (courseIds.length > 0) {
            promises.push(CoreCourses.invalidateCoursesByField('ids', courseIds.join(',')));
        }

        await CorePromiseUtils.allPromises(promises);
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(): Promise<void> {
        const showCategories = this.block.configsRecord && this.block.configsRecord.displaycategories &&
            this.block.configsRecord.displaycategories.value == '1';

        // Timemodified not present, use the block WS to retrieve the info.
        const starredCourses = await AddonBlockStarredCourses.getStarredCourses();

        const courseIds = starredCourses.map((course) => course.id);

        // Get the courses using getCoursesByField to get more info about each course.
        const courses = await CoreCourses.getCoursesByField('ids', courseIds.join(','));

        this.courses = starredCourses.map((recentCourse) => {
            const course = courses.find((course) => recentCourse.id == course.id);

            return Object.assign(recentCourse, course);
        });

        // Get course options and extra info.
        const options = await CoreCourses.getCoursesAdminAndNavOptions(courseIds);
        this.courses.forEach((course) => {
            course.navOptions = options.navOptions[course.id];
            course.admOptions = options.admOptions[course.id];

            if (!showCategories) {
                course.categoryname = '';
            }
        });
    }

    /**
     * Refresh course list based on a CORE_COURSES_MY_COURSES_UPDATED_EVENT event.
     *
     * @param data Event data.
     * @returns Promise resolved when done.
     */
    protected async refreshCourseList(data: CoreCoursesMyCoursesUpdatedEventData): Promise<void> {
        if (data.action === CoreCoursesMyCoursesUpdatedEventAction.ENROL) {
            // Always update if user enrolled in a course.
            // New courses shouldn't be favourite by default, but just in case.
            return this.refreshContent();
        }

        if (data.action === CoreCoursesMyCoursesUpdatedEventAction.STATE_CHANGED && data.state == CORE_COURSES_STATE_FAVOURITE) {
            const courseIndex = this.courses.findIndex((course) => course.id == data.courseId);
            if (courseIndex < 0) {
                // Not found, use WS update. Usually new favourite.
                return this.refreshContent();
            }

            const course = this.courses[courseIndex];
            if (data.value === false) {
                // Unfavourite, just remove.
                this.courses.splice(courseIndex, 1);
            } else {
                // List is not synced, favourite course and place it at the begining.
                course.isfavourite = !!data.value;

                this.courses.splice(courseIndex, 1);
                this.courses.unshift(course);
            }

            await this.invalidateCourseList();
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.coursesObserver?.off();
    }

}

type AddonBlockStarredCoursesCourse =
    (AddonBlockStarredCourse & CoreCourseSearchedDataWithExtraInfoAndOptions) |
    (CoreEnrolledCourseDataWithOptions & {
        categoryname?: string; // Category name,
    });
