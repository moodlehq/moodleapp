// (C) Copyright 2015 Martin Dougiamas
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

import { Component, OnDestroy, OnInit, Input, OnChanges, SimpleChange } from '@angular/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { AddonCalendarProvider } from '../../providers/calendar';
import { AddonCalendarHelperProvider } from '../../providers/helper';
import { CoreCoursesProvider } from '@core/courses/providers/courses';

/**
 * Component that displays a calendar.
 */
@Component({
    selector: 'addon-calendar-calendar',
    templateUrl: 'addon-calendar-calendar.html',
})
export class AddonCalendarCalendarComponent implements OnInit, OnChanges, OnDestroy {
    @Input() initialYear: number | string; // Initial year to load.
    @Input() initialMonth: number | string; // Initial month to load.
    @Input() courseId: number | string;
    @Input() categoryId: number | string; // Category ID the course belongs to.
    @Input() canNavigate?: string | boolean; // Whether to include arrows to change the month. Defaults to true.

    periodName: string;
    weekDays: any[];
    weeks: any[];
    loaded = false;

    protected year: number;
    protected month: number;
    protected categoriesRetrieved = false;
    protected categories = {};

    constructor(eventsProvider: CoreEventsProvider,
            sitesProvider: CoreSitesProvider,
            private calendarProvider: AddonCalendarProvider,
            private calendarHelper: AddonCalendarHelperProvider,
            private domUtils: CoreDomUtilsProvider,
            private timeUtils: CoreTimeUtilsProvider,
            private utils: CoreUtilsProvider,
            private coursesProvider: CoreCoursesProvider) {

    }

    /**
     * Component loaded.
     */
    ngOnInit(): void {
        const now = new Date();

        this.year = this.initialYear ? Number(this.initialYear) : now.getFullYear();
        this.month = this.initialYear ? Number(this.initialYear) : now.getMonth() + 1;
        this.canNavigate = typeof this.canNavigate == 'undefined' ? true : this.utils.isTrueOrOne(this.canNavigate);

        this.fetchData();
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {

        if ((changes.courseId || changes.categoryId) && this.weeks) {
            const courseId = this.courseId ? Number(this.courseId) : undefined,
                categoryId = this.categoryId ? Number(this.categoryId) : undefined;

            this.filterEvents(courseId, categoryId);
        }
    }

    /**
     * Fetch contacts.
     *
     * @param {boolean} [refresh=false] True if we are refreshing contacts, false if we are loading more.
     * @return {Promise<any>} Promise resolved when done.
     */
    fetchData(refresh: boolean = false): Promise<any> {
        const courseId = this.courseId ? Number(this.courseId) : undefined,
            categoryId = this.categoryId ? Number(this.categoryId) : undefined,
            promises = [];

        promises.push(this.loadCategories());

        promises.push(this.calendarProvider.getMonthlyEvents(this.year, this.month, courseId, categoryId).then((result) => {

            // Calculate the period name. We don't use the one in result because it's in server's language.
            this.periodName = this.timeUtils.userDate(new Date(this.year, this.month - 1).getTime(), 'core.strftimemonthyear');

            this.weekDays = this.calendarProvider.getWeekDays(result.daynames[0].dayno);
            this.weeks = result.weeks;

            this.filterEvents(courseId, categoryId);
        }));

        return Promise.all(promises).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Load categories to be able to filter events.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected loadCategories(): Promise<any> {
        if (this.categoriesRetrieved) {
            // Already retrieved, stop.
            return Promise.resolve();
        }

        return this.coursesProvider.getCategories(0, true).then((cats) => {
            this.categoriesRetrieved = true;
            this.categories = {};

            // Index categories by ID.
            cats.forEach((category) => {
                this.categories[category.id] = category;
            });
        }).catch(() => {
            // Ignore errors.
        });
    }

    /**
     * Filter events to only display events belonging to a certain course.
     *
     * @param {number} courseId Course ID.
     * @param {number} categoryId Category the course belongs to.
     */
    filterEvents(courseId: number, categoryId: number): void {

        this.weeks.forEach((week) => {
            week.days.forEach((day) => {
                if (!courseId || courseId < 0) {
                    day.filteredEvents = day.events;
                } else {
                    day.filteredEvents = day.events.filter((event) => {
                        return this.calendarHelper.shouldDisplayEvent(event, courseId, categoryId, this.categories);
                    });
                }

                // Re-calculate some properties.
                this.calendarHelper.calculateDayData(day, day.filteredEvents);
            });
        });
    }

    /**
     * Refresh events.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    refreshData(): Promise<any> {
        const promises = [];

        promises.push(this.calendarProvider.invalidateMonthlyEvents(this.year, this.month));
        promises.push(this.coursesProvider.invalidateCategories(0, true));

        this.categoriesRetrieved = false; // Get categories again.

        return Promise.all(promises).then(() => {
            return this.fetchData(true);
        });
    }

    /**
     * Load next month.
     */
    loadNext(): void {
        if (this.month === 12) {
            this.month = 1;
            this.year++;
        } else {
            this.month++;
        }

        this.loaded = false;

        this.fetchData();
    }

    /**
     * Load previous month.
     */
    loadPrevious(): void {
        if (this.month === 1) {
            this.month = 12;
            this.year--;
        } else {
            this.month--;
        }

        this.loaded = false;

        this.fetchData();
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        // @todo
    }
}
