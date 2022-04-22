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
import { CoreNavigator } from '@services/navigator';

/**
 * Component to render a timeline block.
 */
@Component({
    selector: 'addon-block-timeline',
    templateUrl: 'addon-block-timeline.html',
    styleUrls: ['timeline.scss'],
})
export class AddonBlockTimelineComponent extends CoreBlockBaseComponent implements OnInit {

    sort = 'sortbydates';
    filter = 'next30days';
    currentSite!: CoreSite;
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
    overdue = false;

    searchEnabled = false;
    searchText = '';

    protected courseIdsToInvalidate: number[] = [];
    protected fetchContentDefaultError = 'Error getting timeline data.';
    protected gradePeriodAfter = 0;
    protected gradePeriodBefore = 0;

    constructor() {
        super('AddonBlockTimelineComponent');
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.currentSite = CoreSites.getRequiredCurrentSite();
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }

        this.filter = await this.currentSite.getLocalSiteConfig('AddonBlockTimelineFilter', this.filter);
        this.switchFilter(this.filter);

        this.sort = await this.currentSite.getLocalSiteConfig('AddonBlockTimelineSort', this.sort);

        this.searchEnabled = this.currentSite.isVersionGreaterEqualThan('4.0');

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
        if (this.courseIdsToInvalidate.length > 0) {
            promises.push(CoreCourses.invalidateCoursesByField('ids', this.courseIdsToInvalidate.join(',')));
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
     *
     * @param course Course. If defined, it will update the course events, timeline otherwise.
     * @return Promise resolved when done.
     */
    async loadMore(course?: AddonBlockTimelineCourse): Promise<void> {
        try {
            if (course) {
                const courseEvents =
                    await AddonBlockTimeline.getActionEventsByCourse(course.id, course.canLoadMore, this.searchText);
                course.events = course.events?.concat(courseEvents.events);
                course.canLoadMore = courseEvents.canLoadMore;
            } else {
                await this.fetchMyOverviewTimeline(this.timeline.canLoadMore);
            }
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
        const events = await AddonBlockTimeline.getActionEventsByTimesort(afterEventId, this.searchText);

        this.timeline.events = afterEventId ? this.timeline.events.concat(events.events) : events.events;
        this.timeline.canLoadMore = events.canLoadMore;
    }

    /**
     * Fetch the timeline by courses.
     *
     * @return Promise resolved when done.
     */
    protected async fetchMyOverviewTimelineByCourses(): Promise<void> {
        try {
            this.gradePeriodAfter = parseInt(await this.currentSite.getConfig('coursegraceperiodafter'), 10);
            this.gradePeriodBefore = parseInt(await this.currentSite.getConfig('coursegraceperiodbefore'), 10);
        } catch {
            this.gradePeriodAfter = 0;
            this.gradePeriodBefore = 0;
        }

        // Do not filter courses by date because they can contain activities due.
        this.timelineCourses.courses = await CoreCoursesHelper.getUserCoursesWithOptions();
        this.courseIdsToInvalidate = this.timelineCourses.courses.map((course) => course.id);

        // Filter only in progress courses.
        this.timelineCourses.courses = this.timelineCourses.courses.filter((course) =>
            !course.hidden &&
            !CoreCoursesHelper.isPastCourse(course, this.gradePeriodAfter) &&
            !CoreCoursesHelper.isFutureCourse(course, this.gradePeriodAfter, this.gradePeriodBefore));

        if (this.timelineCourses.courses.length > 0) {
            const courseEvents = await AddonBlockTimeline.getActionEventsByCourses(this.courseIdsToInvalidate, this.searchText);

            this.timelineCourses.courses = this.timelineCourses.courses.filter((course) => {
                if (courseEvents[course.id].events.length == 0) {
                    return false;
                }

                course.events = courseEvents[course.id].events;
                course.canLoadMore = courseEvents[course.id].canLoadMore;

                return true;
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
        this.currentSite.setLocalSiteConfig('AddonBlockTimelineFilter', this.filter);
        this.overdue = this.filter === 'overdue';

        switch (this.filter) {
            case 'overdue':
                this.dataFrom = -14;
                this.dataTo = 1;
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
        this.currentSite.setLocalSiteConfig('AddonBlockTimelineSort', this.sort);

        if (!this.timeline.loaded && this.sort == 'sortbydates') {
            this.fetchContent();
        } else if (!this.timelineCourses.loaded && this.sort == 'sortbycourses') {
            this.fetchContent();
        }
    }

    /**
     * Search text changed.
     *
     * @param searchValue Search value
     */
    searchTextChanged(searchValue = ''): void {
        this.searchText = searchValue || '';

        this.fetchContent();
    }

}

export type AddonBlockTimelineCourse = CoreEnrolledCourseDataWithOptions & {
    events?: AddonCalendarEvent[];
    canLoadMore?: number;
};
