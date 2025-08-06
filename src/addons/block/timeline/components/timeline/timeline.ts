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

import { ChangeDetectionStrategy, Component, effect, OnInit, signal, untracked } from '@angular/core';
import { CoreSites } from '@services/sites';
import { CoreBlockBaseComponent } from '@features/block/classes/base-block-component';
import { AddonBlockTimeline } from '../../services/timeline';
import { CorePromiseUtils } from '@singletons/promise-utils';
import {
    CoreCoursesHelper,
    CoreEnrolledCourseDataWithExtraInfoAndOptions,
} from '@features/courses/services/courses-helper';
import { CoreCourses } from '@features/courses/services/courses';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { AddonBlockTimelineDateRange, AddonBlockTimelineSection } from '@addons/block/timeline/classes/section';
import { FormControl } from '@angular/forms';
import { CoreSharedModule } from '@/core/shared.module';
import { AddonBlockTimelineEventsComponent } from '../events/events';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSearchBoxComponent } from '@features/search/components/search-box/search-box';
import { CoreToasts } from '@services/overlays/toasts';
import { Translate } from '@singletons';

/**
 * Component to render a timeline block.
 */
@Component({
    selector: 'addon-block-timeline',
    templateUrl: 'addon-block-timeline.html',
    styleUrl: 'timeline.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CoreSharedModule,
        CoreSearchBoxComponent,
        AddonBlockTimelineEventsComponent,
    ],
})
export class AddonBlockTimelineComponent extends CoreBlockBaseComponent implements OnInit {

    protected static readonly SORT_CONFIG_KEY = 'AddonBlockTimelineSort';
    protected static readonly FILTER_CONFIG_KEY = 'AddonBlockTimelineFilter';

    readonly sortFormControl = new FormControl(AddonBlockTimelineSort.ByDates, { nonNullable: true });
    readonly sort = signal<AddonBlockTimelineSort>(this.sortFormControl.value);
    readonly sortOptions: AddonBlockTimelineOption<AddonBlockTimelineSort>[];

    readonly filterFormControl = new FormControl(AddonBlockTimelineFilter.Next30Days, { nonNullable: true });
    readonly filter = signal<AddonBlockTimelineFilter>(this.filterFormControl.value);
    readonly dateFilterOptions: readonly AddonBlockTimelineOption<AddonBlockTimelineFilter>[];
    readonly statusFilterOptions: readonly AddonBlockTimelineOption<AddonBlockTimelineFilter>[] = [
        { value: AddonBlockTimelineFilter.All, name: 'core.all' },
        { value: AddonBlockTimelineFilter.Overdue, name: 'addon.block_timeline.overdue' },
    ];

    readonly search = signal<string | null>('');

    protected readonly courses = signal<CoreEnrolledCourseDataWithExtraInfoAndOptions[]>([]);
    readonly sections = signal<AddonBlockTimelineSection[]>([]);

    static readonly FILTER_RANGES: Record<AddonBlockTimelineFilter, AddonBlockTimelineDateRange> = {
        all: { from: -14 },
        overdue: { from: -14, to: 1 },
        next7days: { from: 0, to: 7 },
        next30days: { from: 0, to: 30 },
        next3months: { from: 0, to: 90 },
        next6months: { from: 0, to: 180 },
    };

    readonly init = signal(false);

    // Will prevent toast from showing the first time it loads.
    protected showUpdateToast = false;

    loaded = false;
    protected fetchContentDefaultError = 'Error getting timeline data.';

    constructor() {
        super();
        this.sortOptions = Object.values(AddonBlockTimelineSort).map(value => ({
            value,
            name: `addon.block_timeline.${value}`,
        }));
        this.dateFilterOptions = [
            AddonBlockTimelineFilter.Next7Days,
            AddonBlockTimelineFilter.Next30Days,
            AddonBlockTimelineFilter.Next3Months,
            AddonBlockTimelineFilter.Next6Months,
        ].map(value => ({
            value,
            name: `addon.block_timeline.${value}`,
        }));

        effect(async () => {
            const filter = this.filter();
            const search = this.search();
            const sort = this.sort();

            // This is probably not the best way to do this, but we need to wait for the sort and filters to be loaded
            // otherwise the effect is run twice since the formcontrols are initialized with default values.
            if (!this.init()) {
                return;
            }

            untracked(async () => {
                await this.loadSections(filter, sort, search ?? '');
            });
        });
    }

    get AddonBlockTimelineSort(): typeof AddonBlockTimelineSort {
        return AddonBlockTimelineSort;
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        const currentSite = CoreSites.getRequiredCurrentSite();
        const [sort, filter] = await Promise.all([
            currentSite.getLocalSiteConfig(AddonBlockTimelineComponent.SORT_CONFIG_KEY, AddonBlockTimelineSort.ByDates),
            currentSite.getLocalSiteConfig(AddonBlockTimelineComponent.FILTER_CONFIG_KEY, AddonBlockTimelineFilter.Next30Days),
        ]);

        this.sortFormControl.setValue(sort);
        this.filterFormControl.setValue(filter);

        // Null means search is not available.
        const search = currentSite.isVersionGreaterEqualThan('4.0') ? '' : null;
        this.search.set(search);
        this.init.set(true);
    }

    /**
     * Sort changed.
     *
     * @param sort New sort.
     */
    sortChanged(sort: AddonBlockTimelineSort): void {
        this.sort.set(sort);
        CoreSites.getRequiredCurrentSite().setLocalSiteConfig(AddonBlockTimelineComponent.SORT_CONFIG_KEY, sort);
    }

    /**
     * Filter changed.
     *
     * @param filter New filter.
     */
    filterChanged(filter: AddonBlockTimelineFilter): void {
        this.filter.set(filter);
        CoreSites.getRequiredCurrentSite().setLocalSiteConfig(AddonBlockTimelineComponent.FILTER_CONFIG_KEY, filter);
    }

    /**
     * Search text changed.
     *
     * @param search New search.
     */
    searchChanged(search: string): void {
        this.search.set(search);
    }

    /**
     * @inheritdoc
     */
    async invalidateContent(): Promise<void> {
        const courseIds = this.courses().map(course => course.id);
        await CorePromiseUtils.allPromises([
            AddonBlockTimeline.invalidateActionEventsByTimesort(),
            AddonBlockTimeline.invalidateActionEventsByCourses(),
            CoreCourses.invalidateUserCourses(),
            CoreCourseOptionsDelegate.clearAndInvalidateCoursesOptions(),
            CoreCourses.invalidateCoursesByField('ids', courseIds.join(',')),
        ]);

        this.courses.set([]);
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(): Promise<void> {
        await this.loadSections(this.filter(), this.sort(), this.search() ?? '');
    }

    /**
     * Load sections using search parameters.
     *
     * @param filter Filter.
     * @param sort Sort.
     * @param search Search.
     */
    async loadSections(
        filter: AddonBlockTimelineFilter,
        sort: AddonBlockTimelineSort,
        search: string,
    ): Promise<void> {
        this.loaded = false;

        const includeOverdue = filter === AddonBlockTimelineFilter.Overdue;
        const dateRange = AddonBlockTimelineComponent.FILTER_RANGES[filter];

        try {
            let sections: AddonBlockTimelineSection[] = [];
            switch (sort) {
                case AddonBlockTimelineSort.ByDates:
                    sections = await this.getSectionsByDates(search, includeOverdue, dateRange);
                    break;
                case AddonBlockTimelineSort.ByCourses:
                    sections = await this.getSectionsByCourse(search, includeOverdue, dateRange);
                    break;
            }
            this.sections.set(sections);

            if (this.showUpdateToast) {
                const events = sections.reduce((acc, section) => acc + section.events().length, 0);
                CoreToasts.show({
                    cssClass: 'sr-only',
                    message: Translate.instant('core.resultsfound', { $a: events }),
                });
            }
        } catch (error) {
            // An error ocurred in the function, log the error and just resolve the observable so the workflow continues.
            CoreAlerts.showError(error, { default: this.fetchContentDefaultError });

            this.sections.set([]);
        } finally {
            this.loaded = true;
            this.showUpdateToast = true;
        }
    }

    /**
     * Get sections sorted by dates.
     *
     * @param search Search string.
     * @param overdue Whether to filter overdue events or not.
     * @param dateRange Date range to filter events by.
     * @returns Sections.
     */
    protected async getSectionsByDates(
        search: string,
        overdue: boolean,
        dateRange: AddonBlockTimelineDateRange,
    ): Promise<AddonBlockTimelineSection[]> {
        const section = new AddonBlockTimelineSection(search, overdue, dateRange);

        await section.loadMore();

        return section.events().length > 0 ? [section] : [];
    }

    /**
     * Get sections sorted by courses.
     *
     * @param search Search string.
     * @param overdue Whether to filter overdue events or not.
     * @param dateRange Date range to filter events by.
     * @returns Sections.
     */
    protected async getSectionsByCourse(
        search: string,
        overdue: boolean,
        dateRange: AddonBlockTimelineDateRange,
    ): Promise<AddonBlockTimelineSection[]> {
        let courses = this.courses();

        if (courses.length === 0) {
            // Load courses when sorting by courses unless they are already loaded and no empty.
            courses = await CoreCoursesHelper.getUserCoursesWithOptions();
            this.courses.set(courses);
        }

        if (!courses || courses.length === 0) {
            return [];
        }

        // Do not filter courses by date because they can contain activities due.
        const courseIds = courses.map(course => course.id);
        const gracePeriod = await this.getCoursesGracePeriod();
        const courseEvents = await AddonBlockTimeline.getActionEventsByCourses(courseIds, search);
        const sections = await Promise.all(courses
            .filter(
                course =>
                    !course.hidden &&
                    !CoreCoursesHelper.isFutureCourse(course, gracePeriod.after, gracePeriod.before) &&
                    courseEvents[course.id].events.length > 0,
            )
            .map(async course => {
                const section = new AddonBlockTimelineSection(
                    search,
                    overdue,
                    dateRange,
                    course,
                );

                await section.addEvents(courseEvents[course.id]);

                return section.events().length > 0 ? section : null;
            }));

        return sections.filter((section): section is AddonBlockTimelineSection => !!section);
    }

    /**
     * Get courses grace period for the current site.
     *
     * @returns Courses grace period.
     */
    protected async getCoursesGracePeriod(): Promise<{ before: number; after: number }> {
        try {
            const currentSite = CoreSites.getRequiredCurrentSite();

            return {
                before: parseInt(await currentSite.getConfig('coursegraceperiodbefore'), 10),
                after: parseInt(await currentSite.getConfig('coursegraceperiodafter'), 10),
            };
        } catch {
            return { before: 0, after: 0 };
        }
    }

}

/**
 * Sort options.
 */
export enum AddonBlockTimelineSort {
    ByDates = 'sortbydates',
    ByCourses = 'sortbycourses',
}

/**
 * Filter options.
 */
export const enum AddonBlockTimelineFilter {
    All = 'all',
    Overdue = 'overdue',
    Next7Days = 'next7days',
    Next30Days = 'next30days',
    Next3Months = 'next3months',
    Next6Months = 'next6months',
}

/**
 * Select option.
 */
export interface AddonBlockTimelineOption<Value> {
    value: Value;
    name: string;
}
