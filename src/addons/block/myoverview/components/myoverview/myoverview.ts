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

import { Component, OnInit, Input, OnDestroy, ViewChild, OnChanges, SimpleChange } from '@angular/core';
import { IonSearchbar } from '@ionic/angular';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreSites } from '@services/sites';
import { CoreCoursesProvider, CoreCourses } from '@features/courses/services/courses';
import { CoreCoursesHelper, CoreEnrolledCourseDataWithOptions } from '@features/courses/services/courses-helper';
import { CoreCourseHelper, CorePrefetchStatusInfo } from '@features/course/services/course-helper';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { CoreBlockBaseComponent } from '@features/block/classes/base-block-component';
import { CoreSite } from '@classes/site';
import { CoreUtils } from '@services/utils/utils';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { AddonCourseCompletion } from '@/addons/coursecompletion/services/coursecompletion';

const FILTER_PRIORITY = ['all', 'allincludinghidden', 'inprogress', 'future', 'past', 'favourite', 'hidden', 'custom'];

/**
 * Component to render a my overview block.
 */
@Component({
    selector: 'addon-block-myoverview',
    templateUrl: 'addon-block-myoverview.html',
})
export class AddonBlockMyOverviewComponent extends CoreBlockBaseComponent implements OnInit, OnChanges, OnDestroy {

    @ViewChild('searchbar') searchbar?: IonSearchbar;
    @Input() downloadEnabled = false;

    courses = {
        filter: '',
        all: <CoreEnrolledCourseDataWithOptions[]> [],
        allincludinghidden: <CoreEnrolledCourseDataWithOptions[]> [],
        past: <CoreEnrolledCourseDataWithOptions[]> [],
        inprogress: <CoreEnrolledCourseDataWithOptions[]> [],
        future: <CoreEnrolledCourseDataWithOptions[]> [],
        favourite: <CoreEnrolledCourseDataWithOptions[]> [],
        hidden: <CoreEnrolledCourseDataWithOptions[]> [],
        custom: <CoreEnrolledCourseDataWithOptions[]> [], // Leave it empty to avoid download all those courses.
    };

    customFilter: {
        name: string;
        value: string;
    }[] = [];

    selectedFilter = 'inprogress';
    sort = 'fullname';
    currentSite?: CoreSite;
    filteredCourses: CoreEnrolledCourseDataWithOptions[] = [];
    prefetchCoursesData = {
        all: <CorePrefetchStatusInfo> {
            icon: '',
            statusTranslatable: 'core.loading',
            status: '',
            loading: true,
        },
        allincludinghidden: <CorePrefetchStatusInfo> {
            icon: '',
            statusTranslatable: 'core.loading',
            status: '',
            loading: true,
        },
        inprogress: <CorePrefetchStatusInfo> {
            icon: '',
            statusTranslatable: 'core.loading',
            status: '',
            loading: true,
        },
        past: <CorePrefetchStatusInfo> {
            icon: '',
            statusTranslatable: 'core.loading',
            status: '',
            loading: true,
        },
        future: <CorePrefetchStatusInfo> {
            icon: '',
            statusTranslatable: 'core.loading',
            status: '',
            loading: true,
        },
        favourite: <CorePrefetchStatusInfo> {
            icon: '',
            statusTranslatable: 'core.loading',
            status: '',
            loading: true,
        },
        hidden: <CorePrefetchStatusInfo> {
            icon: '',
            statusTranslatable: 'core.loading',
            status: '',
            loading: true,
        },
        custom: <CorePrefetchStatusInfo> {
            icon: '',
            statusTranslatable: '',
            status: '',
            loading: false,
        }, // Leave it empty to avoid download all those courses.
    };

    showFilters = { // Options are show, disabled, hidden.
        all: 'show',
        allincludinghidden: 'show',
        past: 'show',
        inprogress: 'show',
        future: 'show',
        favourite: 'show',
        hidden: 'show',
        custom: 'hidden',
    };

    showFilter = false;
    showSelectorFilter = false;
    showSortFilter = false;
    downloadCourseEnabled = false;
    downloadCoursesEnabled = false;
    showSortByShortName = false;

    protected prefetchIconsInitialized = false;
    protected isDestroyed = false;
    protected coursesObserver?: CoreEventObserver;
    protected updateSiteObserver?: CoreEventObserver;
    protected courseIds: number[] = [];
    protected fetchContentDefaultError = 'Error getting my overview data.';

    constructor() {
        super('AddonBlockMyOverviewComponent');
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        // Refresh the enabled flags if enabled.
        this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();
        this.downloadCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();

        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();
            this.downloadCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();

        }, CoreSites.getCurrentSiteId());

        this.coursesObserver = CoreEvents.on(
            CoreCoursesProvider.EVENT_MY_COURSES_UPDATED,
            (data) => {

                if (data.action == CoreCoursesProvider.ACTION_ENROL || data.action == CoreCoursesProvider.ACTION_STATE_CHANGED) {
                    this.refreshCourseList();
                }
            },
            CoreSites.getCurrentSiteId(),
        );

        this.currentSite = CoreSites.getCurrentSite();

        const promises: Promise<void>[] = [];
        if (this.currentSite) {
            promises.push(this.currentSite.getLocalSiteConfig('AddonBlockMyOverviewSort', this.sort).then((value) => {
                this.sort = value;

                return;
            }));
            promises.push(this.currentSite.getLocalSiteConfig('AddonBlockMyOverviewFilter', this.selectedFilter).then((value) => {
                this.selectedFilter = value;

                return;
            }));
        }

        Promise.all(promises).finally(() => {
            super.ngOnInit();
        });
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {
        if (changes.downloadEnabled && !changes.downloadEnabled.previousValue && this.downloadEnabled && this.loaded) {
            // Download all courses is enabled now, initialize it.
            this.initPrefetchCoursesIcons();
        }
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        const promises: Promise<void>[] = [];

        // Invalidate course completion data.
        promises.push(CoreCourses.invalidateUserCourses().finally(() =>
            CoreUtils.allPromises(this.courseIds.map((courseId) =>
                AddonCourseCompletion.invalidateCourseCompletion(courseId)))));

        promises.push(CoreCourseOptionsDelegate.clearAndInvalidateCoursesOptions());
        if (this.courseIds.length > 0) {
            promises.push(CoreCourses.invalidateCoursesByField('ids', this.courseIds.join(',')));
        }

        await CoreUtils.allPromises(promises).finally(() => {
            this.prefetchIconsInitialized = false;
        });
    }

    /**
     * Fetch the courses for my overview.
     *
     * @return Promise resolved when done.
     */
    protected async fetchContent(): Promise<void> {
        const config = this.block.configsRecord || {};

        const showCategories = config?.displaycategories?.value == '1';

        const courses = await CoreCoursesHelper.getUserCoursesWithOptions(this.sort, undefined, undefined, showCategories);

        // Check to show sort by short name only if the text is visible.
        if (courses.length > 0) {
            const sampleCourse = courses[0];
            this.showSortByShortName = !!sampleCourse.displayname && !!sampleCourse.shortname &&
                sampleCourse.fullname != sampleCourse.displayname;
        }

        // Rollback to sort by full name if user is sorting by short name then Moodle web change the config.
        if (!this.showSortByShortName && this.sort === 'shortname') {
            this.switchSort('fullname');
        }

        this.courseIds = courses.map((course) => course.id);

        this.showSortFilter = courses.length > 0 && typeof courses[0].lastaccess != 'undefined';

        this.initCourseFilters(courses);

        this.courses.filter = '';
        this.showFilter = false;

        this.showFilters.all = this.getShowFilterValue(
            !config || config.displaygroupingall?.value == '1',
            this.courses.all.length === 0,
        );
        // Do not show allincludinghiddenif config it's not present (before 3.8).
        this.showFilters.allincludinghidden =
            this.getShowFilterValue(
                config?.displaygroupingallincludinghidden?.value == '1',
                this.courses.allincludinghidden.length === 0,
            );

        this.showFilters.inprogress = this.getShowFilterValue(
            !config || config.displaygroupinginprogress?.value == '1',
            this.courses.inprogress.length === 0,
        );
        this.showFilters.past = this.getShowFilterValue(
            !config || config.displaygroupingpast?.value == '1',
            this.courses.past.length === 0,
        );
        this.showFilters.future = this.getShowFilterValue(
            !config || config.displaygroupingfuture?.value == '1',
            this.courses.future.length === 0,
        );

        this.showSelectorFilter = courses.length > 0 && (this.courses.past.length > 0 || this.courses.future.length > 0 ||
                typeof courses[0].enddate != 'undefined');

        this.showFilters.hidden = this.getShowFilterValue(
            this.showSelectorFilter && typeof courses[0].hidden != 'undefined' &&
                (!config || config.displaygroupinghidden?.value == '1'),
            this.courses.hidden.length === 0,
        );

        this.showFilters.favourite = this.getShowFilterValue(
            this.showSelectorFilter && typeof courses[0].isfavourite != 'undefined' &&
                (!config || config.displaygroupingstarred?.value == '1' || config.displaygroupingfavourites?.value == '1'),
            this.courses.favourite.length === 0,
        );

        this.showFilters.custom = this.getShowFilterValue(
            this.showSelectorFilter && config?.displaygroupingcustomfield?.value == '1' && !!config?.customfieldsexport?.value,
            false,
        );
        if (this.showFilters.custom == 'show') {
            this.customFilter = CoreTextUtils.parseJSON(config?.customfieldsexport?.value, []);
        } else {
            this.customFilter = [];
        }

        if (this.showSelectorFilter) {
            // Check if any selector is shown and not disabled.
            this.showSelectorFilter = Object.keys(this.showFilters).some((key) => this.showFilters[key] == 'show');

            if (!this.showSelectorFilter) {
                // All filters disabled, display all the courses.
                this.showFilters.all = 'show';
            }
        }

        if (!this.showSelectorFilter) {
            // No selector, display all the courses.
            this.selectedFilter = 'all';
        }
        this.setCourseFilter(this.selectedFilter);

        this.initPrefetchCoursesIcons();
    }

    /**
     * Helper function to help with filter values.
     *
     * @param showCondition     If true, filter will be shown.
     * @param disabledCondition If true, and showCondition is also met, it will be shown as disabled.
     * @return                   show / disabled / hidden value.
     */
    protected getShowFilterValue(showCondition: boolean, disabledCondition: boolean): string {
        return showCondition ? (disabledCondition ? 'disabled' : 'show') : 'hidden';
    }

    /**
     * The filter has changed.
     *
     * @param Received Event.
     */
    filterChanged(event: Event): void {
        const target = <HTMLInputElement>event?.target || null;

        const newValue = target?.value.trim().toLowerCase();
        if (!newValue || this.courses.allincludinghidden.length <= 0) {
            this.filteredCourses = this.courses.allincludinghidden;
        } else {
            // Use displayname if available, or fullname if not.
            if (this.courses.allincludinghidden.length > 0 &&
                    typeof this.courses.allincludinghidden[0].displayname != 'undefined') {
                this.filteredCourses = this.courses.allincludinghidden.filter((course) =>
                    course.displayname && course.displayname.toLowerCase().indexOf(newValue) > -1);
            } else {
                this.filteredCourses = this.courses.allincludinghidden.filter((course) =>
                    course.fullname.toLowerCase().indexOf(newValue) > -1);
            }
        }
    }

    /**
     * Initialize the prefetch icon for selected courses.
     */
    protected initPrefetchCoursesIcons(): void {
        if (this.prefetchIconsInitialized || !this.downloadEnabled) {
            // Already initialized.
            return;
        }

        this.prefetchIconsInitialized = true;

        Object.keys(this.prefetchCoursesData).forEach(async (filter) => {
            this.prefetchCoursesData[filter] =
                await CoreCourseHelper.initPrefetchCoursesIcons(this.courses[filter], this.prefetchCoursesData[filter]);
        });
    }

    /**
     * Prefetch all the shown courses.
     *
     * @return Promise resolved when done.
     */
    async prefetchCourses(): Promise<void> {
        const selected = this.selectedFilter;
        const initialIcon = this.prefetchCoursesData[selected].icon;

        try {
            await CoreCourseHelper.prefetchCourses(this.courses[selected], this.prefetchCoursesData[selected]);
        } catch (error) {
            if (!this.isDestroyed) {
                CoreDomUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
                this.prefetchCoursesData[selected].icon = initialIcon;
            }
        }
    }

    /**
     * Refresh the list of courses.
     *
     * @return Promise resolved when done.
     */
    protected async refreshCourseList(): Promise<void> {
        CoreEvents.trigger(CoreCoursesProvider.EVENT_MY_COURSES_REFRESHED);

        try {
            await CoreCourses.invalidateUserCourses();
        } catch (error) {
            // Ignore errors.
        }

        await this.loadContent(true);
    }

    /**
     * The selected courses filter have changed.
     *
     * @param filter New filter
     */
    selectedChanged(filter: string): void {
        this.selectedFilter = filter;
        this.setCourseFilter(this.selectedFilter);
    }

    /**
     * Set selected courses filter.
     *
     * @param filter Filter name to set.
     */
    protected async setCourseFilter(filter: string): Promise<void> {
        this.selectedFilter = filter;

        if (this.showFilters.custom == 'show' && filter.startsWith('custom-') &&
            typeof this.customFilter[filter.substr(7)] != 'undefined') {

            const filterName = this.block.configsRecord!.customfiltergrouping.value;
            const filterValue = this.customFilter[filter.substr(7)].value;

            this.loaded = false;
            try {
                const courses = await CoreCourses.getEnrolledCoursesByCustomField(filterName, filterValue);

                // Get the courses information from allincludinghidden to get the max info about the course.
                const courseIds = courses.map((course) => course.id);

                this.filteredCourses = this.courses.allincludinghidden.filter((allCourse) =>
                    courseIds.indexOf(allCourse.id) !== -1);
            } catch (error) {
                CoreDomUtils.showErrorModalDefault(error, this.fetchContentDefaultError);
            } finally {
                this.loaded = true;
            }

            return;
        }

        // Only save the filter if not a custom one.
        this.currentSite?.setLocalSiteConfig('AddonBlockMyOverviewFilter', filter);

        if (this.showFilters[filter] == 'show') {
            this.filteredCourses = this.courses[filter];
        } else {
            const activeFilter = FILTER_PRIORITY.find((name) => this.showFilters[name] == 'show');

            if (activeFilter) {
                this.setCourseFilter(activeFilter);
            }
        }
    }

    /**
     * Init courses filters.
     *
     * @param courses Courses to filter.
     */
    initCourseFilters(courses: CoreEnrolledCourseDataWithOptions[]): void {
        this.courses.allincludinghidden = courses;

        if (this.showSortFilter) {
            if (this.sort == 'lastaccess') {
                courses.sort((a, b) => (b.lastaccess || 0) - (a.lastaccess || 0));
            } else if (this.sort == 'fullname') {
                courses.sort((a, b) => {
                    const compareA = a.fullname.toLowerCase();
                    const compareB = b.fullname.toLowerCase();

                    return compareA.localeCompare(compareB);
                });
            } else if (this.sort == 'shortname') {
                courses.sort((a, b) => {
                    const compareA = a.shortname.toLowerCase();
                    const compareB = b.shortname.toLowerCase();

                    return compareA.localeCompare(compareB);
                });
            }
        }

        this.courses.all = [];
        this.courses.past = [];
        this.courses.inprogress = [];
        this.courses.future = [];
        this.courses.favourite = [];
        this.courses.hidden = [];

        const today = CoreTimeUtils.timestamp();
        courses.forEach((course) => {
            if (course.hidden) {
                this.courses.hidden.push(course);
            } else {
                this.courses.all.push(course);

                if ((course.enddate && course.enddate < today) || course.completed) {
                    // Courses that have already ended.
                    this.courses.past.push(course);
                } else if (course.startdate && course.startdate > today) {
                    // Courses that have not started yet.
                    this.courses.future.push(course);
                } else {
                    // Courses still in progress.
                    this.courses.inprogress.push(course);
                }

                if (course.isfavourite) {
                    this.courses.favourite.push(course);
                }
            }
        });

        this.setCourseFilter(this.selectedFilter);
    }

    /**
     * The selected courses sort filter have changed.
     *
     * @param sort New sorting.
     */
    switchSort(sort: string): void {
        this.sort = sort;
        this.currentSite?.setLocalSiteConfig('AddonBlockMyOverviewSort', this.sort);
        this.initCourseFilters(this.courses.allincludinghidden);
    }

    /**
     * Show or hide the filter.
     */
    switchFilter(): void {
        this.showFilter = !this.showFilter;
        this.courses.filter = '';

        if (this.showFilter) {
            this.filteredCourses = this.courses.allincludinghidden;
        } else {
            this.setCourseFilter(this.selectedFilter);
        }
    }

    /**
     * Popover closed after clicking switch filter.
     */
    switchFilterClosed(): void {
        if (this.showFilter) {
            setTimeout(() => {
                this.searchbar?.setFocus();
            });
        }
    }

    /**
     * If switch button that enables the filter input is shown or not.
     *
     * @return If switch button that enables the filter input is shown or not.
     */
    showFilterSwitchButton(): boolean {
        return this.loaded && this.courses.allincludinghidden && this.courses.allincludinghidden.length > 5;
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.coursesObserver?.off();
        this.updateSiteObserver?.off();
    }

}
