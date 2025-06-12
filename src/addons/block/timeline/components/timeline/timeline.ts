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

import { ChangeDetectionStrategy, Component, OnInit, HostListener } from '@angular/core';
import { CoreSites } from '@services/sites';
import { ICoreBlockComponent } from '@features/block/classes/base-block-component';
import { AddonBlockTimeline } from '../../services/timeline';
import { CoreUtils } from '@services/utils/utils';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreCoursesHelper, CoreEnrolledCourseDataWithOptions } from '@features/courses/services/courses-helper';
import { CoreCourses } from '@features/courses/services/courses';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { BehaviorSubject, combineLatest, Observable, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, map, share, tap, mergeAll } from 'rxjs/operators';
import { AddonBlockTimelineDateRange, AddonBlockTimelineSection } from '@addons/block/timeline/classes/section';
import { FormControl } from '@angular/forms';
import { formControlValue, resolved } from '@/core/utils/rxjs';
import { CoreLogger } from '@singletons/logger';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreSearchComponentsModule } from '@features/search/components/components.module';
import { AddonBlockTimelineEventsComponent } from '../events/events';

/**
 * Component to render a timeline block.
 */
@Component({
    selector: 'addon-block-timeline',
    templateUrl: 'addon-block-timeline.html',
    styleUrl: 'timeline.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreSearchComponentsModule,
        AddonBlockTimelineEventsComponent,
    ],
})
export class AddonBlockTimelineComponent implements OnInit, ICoreBlockComponent {

    sort = new FormControl(AddonBlockTimelineSort.ByCourses); // Aspire School: Default to courses
    sort$!: Observable<AddonBlockTimelineSort>;
    sortOptions!: AddonBlockTimelineOption<AddonBlockTimelineSort>[];
    filter = new FormControl(AddonBlockTimelineFilter.Next7Days); // Aspire School: Default to next 7 days
    filter$!: Observable<AddonBlockTimelineFilter>;
    statusFilter = new FormControl(AddonBlockTimelineFilter.All); // Aspire School: Status filter (All/Overdue/Done)
    statusFilter$!: Observable<AddonBlockTimelineFilter>;
    dateFilter = new FormControl(AddonBlockTimelineFilter.Next7Days); // Aspire School: Date filter
    dateFilter$!: Observable<AddonBlockTimelineFilter>;
    statusFilterOptions!: AddonBlockTimelineOption<AddonBlockTimelineFilter>[];
    dateFilterOptions!: AddonBlockTimelineOption<AddonBlockTimelineFilter>[];
    search$: Subject<string | null>;
    sections$!: Observable<AddonBlockTimelineSection[]>;
    loaded = false;

    protected logger: CoreLogger;
    protected courseIdsToInvalidate: number[] = [];
    protected fetchContentDefaultError = 'Error getting timeline data.';

    constructor() {
        this.logger = CoreLogger.getInstance('AddonBlockTimelineComponent');
        this.search$ = new BehaviorSubject<string | null>(null);
        this.initializeSort();
        this.initializeFilter();
        this.initializeStatusFilter();
        this.initializeDateFilter();
        this.initializeSections();
    }

    get AddonBlockTimelineSort(): typeof AddonBlockTimelineSort {
        return AddonBlockTimelineSort;
    }

    // Expose individual filter values for template use (const enums can't be used directly in templates)
    readonly filterAll = AddonBlockTimelineFilter.All;
    readonly filterOverdue = AddonBlockTimelineFilter.Overdue;
    readonly filterDone = AddonBlockTimelineFilter.Done;
    readonly filterNext7Days = AddonBlockTimelineFilter.Next7Days;
    readonly filterNext30Days = AddonBlockTimelineFilter.Next30Days;
    readonly filterNext3Months = AddonBlockTimelineFilter.Next3Months;
    readonly filterNext6Months = AddonBlockTimelineFilter.Next6Months;
    
    // UI state
    showFilterDropdown = false;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        const currentSite = CoreSites.getRequiredCurrentSite();
        const [sort, filter, statusFilter, dateFilter, search] = await Promise.all([
            // Aspire School: Default to sort by courses
            currentSite.getLocalSiteConfig('AddonBlockTimelineSort', AddonBlockTimelineSort.ByCourses),
            currentSite.getLocalSiteConfig('AddonBlockTimelineFilter', AddonBlockTimelineFilter.Next7Days),
            currentSite.getLocalSiteConfig('AddonBlockTimelineStatusFilter', AddonBlockTimelineFilter.All),
            currentSite.getLocalSiteConfig('AddonBlockTimelineDateFilter', AddonBlockTimelineFilter.Next7Days),
            currentSite.isVersionGreaterEqualThan('4.0') ? '' : null,
        ]);

        this.sort.setValue(sort);
        this.filter.setValue(filter);
        this.statusFilter.setValue(statusFilter);
        this.dateFilter.setValue(dateFilter);
        this.search$.next(search);
    }

    /**
     * Sort changed.
     *
     * @param sort New sort.
     */
    sortChanged(sort: AddonBlockTimelineSort): void {
        CoreSites.getRequiredCurrentSite().setLocalSiteConfig('AddonBlockTimelineSort', sort);
    }

    /**
     * Filter changed.
     *
     * @param filter New filter.
     */
    filterChanged(filter: AddonBlockTimelineFilter): void {
        CoreSites.getRequiredCurrentSite().setLocalSiteConfig('AddonBlockTimelineFilter', filter);
    }

    /**
     * Status filter changed.
     *
     * @param filter New filter.
     */
    statusFilterChanged(filter: AddonBlockTimelineFilter): void {
        CoreSites.getRequiredCurrentSite().setLocalSiteConfig('AddonBlockTimelineStatusFilter', filter);
    }

    /**
     * Date filter changed.
     *
     * @param filter New filter.
     */
    dateFilterChanged(filter: AddonBlockTimelineFilter): void {
        CoreSites.getRequiredCurrentSite().setLocalSiteConfig('AddonBlockTimelineDateFilter', filter);
    }

    /**
     * Search text changed.
     *
     * @param search New search.
     */
    searchChanged(search: string): void {
        this.search$.next(search);
    }

    /**
     * Toggle filter dropdown visibility.
     */
    toggleFilterDropdown(): void {
        this.showFilterDropdown = !this.showFilterDropdown;
    }

    /**
     * Select a filter and close dropdown.
     *
     * @param type Filter type ('status' or 'date').
     * @param value Filter value.
     */
    selectFilter(type: 'status' | 'date', value: AddonBlockTimelineFilter): void {
        if (type === 'status') {
            this.statusFilter.setValue(value);
            this.statusFilterChanged(value);
        } else {
            this.dateFilter.setValue(value);
            this.dateFilterChanged(value);
        }
        this.showFilterDropdown = false;
    }

    /**
     * Select a sort option and close dropdown.
     *
     * @param value Sort value.
     */
    selectSort(value: AddonBlockTimelineSort): void {
        this.sort.setValue(value);
        this.sortChanged(value);
        this.showFilterDropdown = false;
    }

    /**
     * Handle clicks outside the filter dropdown.
     */
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        const filterElement = target.closest('.aspire-compact-filters');
        
        if (!filterElement && this.showFilterDropdown) {
            this.showFilterDropdown = false;
        }
    }

    /**
     * Get the label for the current date filter.
     *
     * @returns Translation key for the date filter.
     */
    getDateFilterLabel(): string {
        const currentFilter = this.dateFilter.value;
        const option = this.dateFilterOptions.find(opt => opt.value === currentFilter);
        return option?.name || '';
    }

    /**
     * @inheritdoc
     */
    async invalidateContent(): Promise<void> {
        await CoreUtils.allPromises([
            AddonBlockTimeline.invalidateActionEventsByTimesort(),
            AddonBlockTimeline.invalidateActionEventsByCourses(),
            CoreCourses.invalidateUserCourses(),
            CoreCourseOptionsDelegate.clearAndInvalidateCoursesOptions(),
            CoreCourses.invalidateCoursesByField('ids', this.courseIdsToInvalidate.join(',')),
        ]);
    }

    /**
     * Initialize sort properties.
     */
    protected initializeSort(): void {
        this.sort$ = formControlValue(this.sort);
        this.sortOptions = Object.values(AddonBlockTimelineSort).map(value => ({
            value,
            name: `addon.block_timeline.${value}`,
        }));
    }

    /**
     * Initialize filter properties.
     */
    protected initializeFilter(): void {
        this.filter$ = formControlValue(this.filter);
    }

    /**
     * Initialize status filter properties.
     */
    protected initializeStatusFilter(): void {
        this.statusFilter$ = formControlValue(this.statusFilter);
        this.statusFilterOptions = [
            { value: AddonBlockTimelineFilter.All, name: 'core.all' },
            { value: AddonBlockTimelineFilter.Overdue, name: 'addon.block_timeline.overdue' },
            { value: AddonBlockTimelineFilter.Done, name: 'addon.block_timeline.done' },
        ];
    }

    /**
     * Initialize date filter properties.
     */
    protected initializeDateFilter(): void {
        this.dateFilter$ = formControlValue(this.dateFilter);
        this.dateFilterOptions = [
            AddonBlockTimelineFilter.Next7Days,
            AddonBlockTimelineFilter.Next30Days,
            AddonBlockTimelineFilter.Next3Months,
            AddonBlockTimelineFilter.Next6Months,
        ]
            .map(value => ({
                value,
                name: `addon.block_timeline.${value}`,
            }));
    }

    /**
     * Initialize sections properties.
     */
    protected initializeSections(): void {
        const filtersRange: Record<AddonBlockTimelineFilter, AddonBlockTimelineDateRange> = {
            all: { from: -14 },
            overdue: { from: -14, to: 1 },
            done: { from: -365 }, // Show completed events from last year
            next7days: { from: 0, to: 7 },
            next30days: { from: 0, to: 30 },
            next3months: { from: 0, to: 90 },
            next6months: { from: 0, to: 180 },
        };
        const sortValue = this.sort.valueChanges as Observable<AddonBlockTimelineSort>;
        const courses = sortValue.pipe(
            distinctUntilChanged(),
            map(async sort => {
                switch (sort) {
                    case AddonBlockTimelineSort.ByDates:
                        return [];
                    case AddonBlockTimelineSort.ByCourses:
                        return CoreCoursesHelper.getUserCoursesWithOptions();
                }
            }),
            resolved(),
            map(courses => {
                this.courseIdsToInvalidate = courses.map(course => course.id);

                return courses;
            }),
        );

        this.sections$ = combineLatest([this.statusFilter$, this.dateFilter$, sortValue, this.search$, courses]).pipe(
            map(async ([statusFilter, dateFilter, sort, search, courses]) => {
                const includeOverdue = statusFilter === AddonBlockTimelineFilter.Overdue;
                const includeDone = statusFilter === AddonBlockTimelineFilter.Done;
                
                // Use date filter range unless status filter is overdue or done
                const dateRange = statusFilter === AddonBlockTimelineFilter.Overdue 
                    ? filtersRange.overdue 
                    : statusFilter === AddonBlockTimelineFilter.Done
                    ? filtersRange.done
                    : filtersRange[dateFilter];

                switch (sort) {
                    case AddonBlockTimelineSort.ByDates:
                        return this.getSectionsByDates(search, includeOverdue, includeDone, dateRange);
                    case AddonBlockTimelineSort.ByCourses:
                        return this.getSectionsByCourse(search, includeOverdue, includeDone, dateRange, courses);
                }
            }),
            resolved(),
            mergeAll(),
            catchError(error => {
                // An error ocurred in the function, log the error and just resolve the observable so the workflow continues.
                this.logger.error(error);

                // Error getting data, fail.
                CoreDomUtils.showErrorModalDefault(error, this.fetchContentDefaultError, true);

                return of([] as AddonBlockTimelineSection[]);
            }),
            share(),
            tap(() => (this.loaded = true)),
        );
    }

    /**
     * Get sections sorted by dates.
     *
     * @param search Search string.
     * @param overdue Whether to filter overdue events or not.
     * @param done Whether to filter done events or not.
     * @param dateRange Date range to filter events by.
     * @returns Sections.
     */
    protected async getSectionsByDates(
        search: string | null,
        overdue: boolean,
        done: boolean,
        dateRange: AddonBlockTimelineDateRange,
    ): Promise<Observable<AddonBlockTimelineSection[]>> {
        const section = new AddonBlockTimelineSection(search, overdue, dateRange, undefined, undefined, undefined, done);

        await section.loadMore();

        return section.data$.pipe(map(({ events }) => events.length > 0 ? [section] : []));
    }

    /**
     * Get sections sorted by courses.
     *
     * @param search Search string.
     * @param overdue Whether to filter overdue events or not.
     * @param done Whether to filter done events or not.
     * @param dateRange Date range to filter events by.
     * @param courses Courses.
     * @returns Sections.
     */
    protected async getSectionsByCourse(
        search: string | null,
        overdue: boolean,
        done: boolean,
        dateRange: AddonBlockTimelineDateRange,
        courses: CoreEnrolledCourseDataWithOptions[],
    ): Promise<Observable<AddonBlockTimelineSection[]>> {
        // Do not filter courses by date because they can contain activities due.
        const courseIds = courses.map(course => course.id);
        const gracePeriod = await this.getCoursesGracePeriod();
        const courseEvents = await AddonBlockTimeline.getActionEventsByCourses(courseIds, search ?? '');
        
        // Aspire School: Sort courses by their most recent event
        const filteredCourses = courses
            .filter(
                course =>
                    !course.hidden &&
                    !CoreCoursesHelper.isFutureCourse(course, gracePeriod.after, gracePeriod.before) &&
                    courseEvents[course.id].events.length > 0,
            )
            .sort((a, b) => {
                // Get the nearest/most urgent event from each course
                const aEvents = courseEvents[a.id].events;
                const bEvents = courseEvents[b.id].events;
                const aNearest = aEvents.length > 0 ? Math.min(...aEvents.map(e => e.timesort)) : Number.MAX_SAFE_INTEGER;
                const bNearest = bEvents.length > 0 ? Math.min(...bEvents.map(e => e.timesort)) : Number.MAX_SAFE_INTEGER;
                return aNearest - bNearest; // Most urgent/nearest deadline first
            });
            
        const sectionObservables = filteredCourses
            .map(course => {
                const section = new AddonBlockTimelineSection(
                    search,
                    overdue,
                    dateRange,
                    course,
                    courseEvents[course.id].events,
                    courseEvents[course.id].canLoadMore,
                    done,
                );

                return section.data$.pipe(map(({ events }) => events.length > 0 ? section : null));
            });

        if (sectionObservables.length === 0) {
            return of([]);
        }

        return combineLatest(sectionObservables).pipe(
            map(sections => sections.filter(
                (section: AddonBlockTimelineSection | null): section is AddonBlockTimelineSection => !!section,
            )),
        );
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
    Done = 'done',
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
