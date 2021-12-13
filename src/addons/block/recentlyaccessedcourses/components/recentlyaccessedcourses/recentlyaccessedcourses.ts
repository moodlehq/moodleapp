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

import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import {
    CoreCoursesProvider,
    CoreCoursesMyCoursesUpdatedEventData,
    CoreCourses,
    CoreCourseSummaryData,
} from '@features/courses/services/courses';
import {
    CoreCourseSearchedDataWithExtraInfoAndOptions,
    CoreCoursesHelper,
    CoreEnrolledCourseDataWithOptions,
} from '@features/courses/services/courses-helper';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { AddonCourseCompletion } from '@/addons/coursecompletion/services/coursecompletion';
import { CoreBlockBaseComponent } from '@features/block/classes/base-block-component';
import { CoreUtils } from '@services/utils/utils';
import { CoreSite } from '@classes/site';

/**
 * Component to render a recent courses block.
 */
@Component({
    selector: 'addon-block-recentlyaccessedcourses',
    templateUrl: 'addon-block-recentlyaccessedcourses.html',
})
export class AddonBlockRecentlyAccessedCoursesComponent extends CoreBlockBaseComponent implements OnInit, OnDestroy {

    @Input() downloadEnabled = false;

    courses: AddonBlockRecentlyAccessedCourse[] = [];

    downloadCourseEnabled = false;
    scrollElementId!: string;

    protected site!: CoreSite;
    protected isDestroyed = false;
    protected coursesObserver?: CoreEventObserver;
    protected updateSiteObserver?: CoreEventObserver;
    protected fetchContentDefaultError = 'Error getting recent courses data.';

    constructor() {
        super('AddonBlockRecentlyAccessedCoursesComponent');

        this.site = CoreSites.getRequiredCurrentSite();
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        // Generate unique id for scroll element.
        const scrollId = CoreUtils.getUniqueId('AddonBlockRecentlyAccessedCoursesComponent-Scroll');

        this.scrollElementId = `addon-block-recentlyaccessedcourses-scroll-${scrollId}`;

        // Refresh the enabled flags if enabled.
        this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();

        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();

        }, this.site.getId());

        this.coursesObserver = CoreEvents.on(
            CoreCoursesProvider.EVENT_MY_COURSES_UPDATED,
            (data) => {
                this.refreshCourseList(data);
            },
            this.site.getId(),
        );

        super.ngOnInit();
    }

    /**
     * @inheritdoc
     */
    protected async invalidateContent(): Promise<void> {
        const courseIds = this.courses.map((course) => course.id);

        await this.invalidateCourses(courseIds);
    }

    /**
     * Helper function to invalidate only selected courses.
     *
     * @param courseIds Course Id array.
     * @return Promise resolved when done.
     */
    protected async invalidateCourses(courseIds: number[]): Promise<void> {
        const promises: Promise<void>[] = [];

        const invalidateCoursePromise = this.site.isVersionGreaterEqualThan('3.8')
            ? CoreCourses.invalidateRecentCourses()
            : CoreCourses.invalidateUserCourses();

        // Invalidate course completion data.
        promises.push(invalidateCoursePromise.finally(() =>
            CoreUtils.allPromises(courseIds.map((courseId) =>
                AddonCourseCompletion.invalidateCourseCompletion(courseId)))));

        if (courseIds.length  == 1) {
            promises.push(CoreCourseOptionsDelegate.clearAndInvalidateCoursesOptions(courseIds[0]));
        } else {
            promises.push(CoreCourseOptionsDelegate.clearAndInvalidateCoursesOptions());
        }
        if (courseIds.length > 0) {
            promises.push(CoreCourses.invalidateCoursesByField('ids', courseIds.join(',')));
        }

        await CoreUtils.allPromises(promises);
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(): Promise<void> {
        const showCategories = this.block.configsRecord && this.block.configsRecord.displaycategories &&
            this.block.configsRecord.displaycategories.value == '1';

        let recentCourses: CoreCourseSummaryData[] = [];
        try {
            recentCourses = await CoreCourses.getRecentCourses();
        } catch {
            // WS is failing on 3.7 and bellow, use a fallback.
            this.courses = await CoreCoursesHelper.getUserCoursesWithOptions('lastaccess', 10, undefined, showCategories);

            return;
        }

        const courseIds = recentCourses.map((course) => course.id);

        // Get the courses using getCoursesByField to get more info about each course.
        const courses = await CoreCourses.getCoursesByField('ids', courseIds.join(','));

        this.courses = recentCourses.map((recentCourse) => {
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
     * Refresh course list based on a EVENT_MY_COURSES_UPDATED event.
     *
     * @param data Event data.
     * @return Promise resolved when done.
     */
    protected async refreshCourseList(data: CoreCoursesMyCoursesUpdatedEventData): Promise<void> {
        if (data.action == CoreCoursesProvider.ACTION_ENROL) {
            // Always update if user enrolled in a course.
            return await this.refreshContent();
        }

        const courseIndex = this.courses.findIndex((course) => course.id == data.courseId);
        const course = this.courses[courseIndex];
        if (data.action == CoreCoursesProvider.ACTION_VIEW && data.courseId != CoreSites.getCurrentSiteHomeId()) {
            if (!course) {
                // Not found, use WS update.
                return await this.refreshContent();
            }

            // Place at the begining.
            this.courses.splice(courseIndex, 1);
            this.courses.unshift(course);

            await this.invalidateCourses([course.id]);
        }

        if (data.action == CoreCoursesProvider.ACTION_STATE_CHANGED &&
            data.state == CoreCoursesProvider.STATE_FAVOURITE && course) {
            course.isfavourite = !!data.value;
            await this.invalidateCourses([course.id]);
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.coursesObserver?.off();
        this.updateSiteObserver?.off();
    }

}

type AddonBlockRecentlyAccessedCourse =
    (Omit<CoreCourseSummaryData, 'visible'> & CoreCourseSearchedDataWithExtraInfoAndOptions) |
    (CoreEnrolledCourseDataWithOptions & {
        categoryname?: string; // Category name,
    });
