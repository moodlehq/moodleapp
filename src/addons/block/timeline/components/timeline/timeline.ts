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

import { Component, OnInit } from '@angular/core';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreSites } from '@services/sites';
import { CoreBlockBaseComponent } from '@features/block/classes/base-block-component';
import { AddonBlockTimeline } from '../../services/timeline';
import { AddonCalendarEvent } from '@addons/calendar/services/calendar';
import { CoreUtils } from '@services/utils/utils';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreCoursesHelper, CoreEnrolledCourseDataWithOptions } from '@features/courses/services/courses-helper';
import { CoreSite } from '@classes/site';
import { CoreCourses } from '@features/courses/services/courses';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';

/**
 * Component to render a timeline block.
 */
@Component({
    selector: 'addon-block-timeline',
    templateUrl: 'addon-block-timeline.html',
})
export class AddonBlockTimelineComponent extends CoreBlockBaseComponent implements OnInit {

    sort = 'sortbydates';
    filter = 'next30days';
    currentSite?: CoreSite;
    timeline: {
        events: AddonCalendarEvent[];
        loaded: boolean;
        canLoadMore?: number;
    } = {
        events: <AddonCalendarEvent[]> [],
        loaded: false,
    };

    timelineCourses: {
        courses: AddonBlockTimelineCourse[];
        loaded: boolean;
        canLoadMore?: number;
    } = {
        courses: [],
        loaded: false,
    };

    dataFrom?: number;
    dataTo?: number;

    protected courseIds: number[] = [];
    protected fetchContentDefaultError = 'Error getting timeline data.';

    constructor() {
        super('AddonBlockTimelineComponent');
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        this.currentSite = CoreSites.getCurrentSite();

        this.filter = await this.currentSite!.getLocalSiteConfig('AddonBlockTimelineFilter', this.filter);
        this.switchFilter(this.filter);

        this.sort = await this.currentSite!.getLocalSiteConfig('AddonBlockTimelineSort', this.sort);

        super.ngOnInit();
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Resolved when done.
     */
    protected invalidateContent(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonBlockTimeline.invalidateActionEventsByTimesort());
        promises.push(AddonBlockTimeline.invalidateActionEventsByCourses());
        promises.push(CoreCourses.invalidateUserCourses());
        promises.push(CoreCourseOptionsDelegate.clearAndInvalidateCoursesOptions());
        if (this.courseIds.length > 0) {
            promises.push(CoreCourses.invalidateCoursesByField('ids', this.courseIds.join(',')));
        }

        return CoreUtils.allPromises(promises);
    }

    /**
     * Fetch the courses for my overview.
     *
     * @return Promise resolved when done.
     */
    protected async fetchContent(): Promise<void> {
        if (this.sort == 'sortbydates') {
            return this.fetchMyOverviewTimeline().finally(() => {
                this.timeline.loaded = true;
            });
        }

        if (this.sort == 'sortbycourses') {
            return this.fetchMyOverviewTimelineByCourses().finally(() => {
                this.timelineCourses.loaded = true;
            });
        }
    }

    /**
     * Load more events.
     */
    async loadMoreTimeline(): Promise<void> {
        try {
            await this.fetchMyOverviewTimeline(this.timeline.canLoadMore);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, this.fetchContentDefaultError);
        }
    }

    /**
     * Load more events.
     *
     * @param course Course.
     * @return Promise resolved when done.
     */
    async loadMoreCourse(course: AddonBlockTimelineCourse): Promise<void> {
        try {
            const courseEvents = await AddonBlockTimeline.getActionEventsByCourse(course.id, course.canLoadMore);
            course.events = course.events?.concat(courseEvents.events);
            course.canLoadMore = courseEvents.canLoadMore;
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, this.fetchContentDefaultError);
        }
    }

    /**
     * Fetch the timeline.
     *
     * @param afterEventId The last event id.
     * @return Promise resolved when done.
     */
    protected async fetchMyOverviewTimeline(afterEventId?: number): Promise<void> {
        const events = await AddonBlockTimeline.getActionEventsByTimesort(afterEventId);

        this.timeline.events = events.events;
        this.timeline.canLoadMore = events.canLoadMore;
    }

    /**
     * Fetch the timeline by courses.
     *
     * @return Promise resolved when done.
     */
    protected async fetchMyOverviewTimelineByCourses(): Promise<void> {
        const courses = await CoreCoursesHelper.getUserCoursesWithOptions();
        const today = CoreTimeUtils.timestamp();

        this.timelineCourses.courses = courses.filter((course) =>
            (course.startdate || 0) <= today && (!course.enddate || course.enddate >= today));

        if (this.timelineCourses.courses.length > 0) {
            this.courseIds = this.timelineCourses.courses.map((course) => course.id);

            const courseEvents = await AddonBlockTimeline.getActionEventsByCourses(this.courseIds);

            this.timelineCourses.courses.forEach((course) => {
                course.events = courseEvents[course.id].events;
                course.canLoadMore = courseEvents[course.id].canLoadMore;
            });
        }
    }

    /**
     * Change timeline filter being viewed.
     *
     * @param filter New filter.
     */
    switchFilter(filter: string): void {
        this.filter = filter;
        this.currentSite?.setLocalSiteConfig('AddonBlockTimelineFilter', this.filter);

        switch (this.filter) {
            case 'overdue':
                this.dataFrom = -14;
                this.dataTo = 0;
                break;
            case 'next7days':
                this.dataFrom = 0;
                this.dataTo = 7;
                break;
            case 'next30days':
                this.dataFrom = 0;
                this.dataTo = 30;
                break;
            case 'next3months':
                this.dataFrom = 0;
                this.dataTo = 90;
                break;
            case 'next6months':
                this.dataFrom = 0;
                this.dataTo = 180;
                break;
            default:
            case 'all':
                this.dataFrom = -14;
                this.dataTo = undefined;
                break;
        }
    }

    /**
     * Change timeline sort being viewed.
     *
     * @param sort New sorting.
     */
    switchSort(sort: string): void {
        this.sort = sort;
        this.currentSite?.setLocalSiteConfig('AddonBlockTimelineSort', this.sort);

        if (!this.timeline.loaded && this.sort == 'sortbydates') {
            this.fetchContent();
        } else if (!this.timelineCourses.loaded && this.sort == 'sortbycourses') {
            this.fetchContent();
        }
    }

}

type AddonBlockTimelineCourse = CoreEnrolledCourseDataWithOptions & {
    events?: AddonCalendarEvent[];
    canLoadMore?: number;
};
