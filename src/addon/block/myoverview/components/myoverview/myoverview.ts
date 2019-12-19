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

import { Component, OnInit, Input, OnDestroy, ViewChild, Injector, OnChanges, SimpleChange } from '@angular/core';
import { Searchbar } from 'ionic-angular';
import { CoreEventsProvider } from '@providers/events';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreSitesProvider } from '@providers/sites';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreCoursesHelperProvider } from '@core/courses/providers/helper';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreCourseOptionsDelegate } from '@core/course/providers/options-delegate';
import { AddonCourseCompletionProvider } from '@addon/coursecompletion/providers/coursecompletion';
import { CoreBlockBaseComponent } from '@core/block/classes/base-block-component';

/**
 * Component to render a my overview block.
 */
@Component({
    selector: 'addon-block-myoverview',
    templateUrl: 'addon-block-myoverview.html'
})
export class AddonBlockMyOverviewComponent extends CoreBlockBaseComponent implements OnInit, OnChanges, OnDestroy {
    @ViewChild('searchbar') searchbar: Searchbar;
    @Input() downloadEnabled: boolean;

    courses = {
        filter: '',
        all: [],
        allincludinghidden: [],
        past: [],
        inprogress: [],
        future: [],
        favourite: [],
        hidden: [],
        custom: [], // Leave it empty to avoid download all those courses.
    };
    customFilter: any[] = [];
    selectedFilter = 'inprogress';
    sort = 'fullname';
    currentSite: any;
    filteredCourses: any[] = [];
    prefetchCoursesData = {
        all: {},
        allincludinghidden: {},
        inprogress: {},
        past: {},
        future: {},
        favourite: {},
        hidden: {},
        custom: {}, // Leave it empty to avoid download all those courses.
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
    downloadCourseEnabled: boolean;
    downloadCoursesEnabled: boolean;

    protected prefetchIconsInitialized = false;
    protected isDestroyed;
    protected coursesObserver;
    protected updateSiteObserver;
    protected courseIds = [];
    protected fetchContentDefaultError = 'Error getting my overview data.';

    constructor(injector: Injector,
            protected coursesProvider: CoreCoursesProvider,
            protected courseCompletionProvider: AddonCourseCompletionProvider,
            protected eventsProvider: CoreEventsProvider,
            protected courseHelper: CoreCourseHelperProvider,
            protected courseOptionsDelegate: CoreCourseOptionsDelegate,
            protected coursesHelper: CoreCoursesHelperProvider,
            protected sitesProvider: CoreSitesProvider,
            protected timeUtils: CoreTimeUtilsProvider) {

        super(injector, 'AddonBlockMyOverviewComponent');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        // Refresh the enabled flags if enabled.
        this.downloadCourseEnabled = !this.coursesProvider.isDownloadCourseDisabledInSite();
        this.downloadCoursesEnabled = !this.coursesProvider.isDownloadCoursesDisabledInSite();

        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = this.eventsProvider.on(CoreEventsProvider.SITE_UPDATED, () => {
            this.downloadCourseEnabled = !this.coursesProvider.isDownloadCourseDisabledInSite();
            this.downloadCoursesEnabled = !this.coursesProvider.isDownloadCoursesDisabledInSite();

        }, this.sitesProvider.getCurrentSiteId());

        this.coursesObserver = this.eventsProvider.on(CoreCoursesProvider.EVENT_MY_COURSES_UPDATED, () => {
            this.refreshContent();
        }, this.sitesProvider.getCurrentSiteId());

        this.currentSite = this.sitesProvider.getCurrentSite();

        const promises = [];
        promises.push(this.currentSite.getLocalSiteConfig('AddonBlockMyOverviewSort', this.sort).then((value) => {
            this.sort = value;
        }));
        promises.push(this.currentSite.getLocalSiteConfig('AddonBlockMyOverviewFilter', this.selectedFilter).then((value) => {
            this.selectedFilter = value;
        }));

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
    protected invalidateContent(): Promise<any> {
        const promises = [];

        promises.push(this.coursesProvider.invalidateUserCourses().finally(() => {
            // Invalidate course completion data.
            promises.push(this.coursesProvider.invalidateUserCourses().finally(() => {
                // Invalidate course completion data.
                return this.utils.allPromises(this.courseIds.map((courseId) => {
                    return this.courseCompletionProvider.invalidateCourseCompletion(courseId);
                 }));
            }));
        }));

        promises.push(this.courseOptionsDelegate.clearAndInvalidateCoursesOptions());
        if (this.courseIds.length > 0) {
            promises.push(this.coursesProvider.invalidateCoursesByField('ids', this.courseIds.join(',')));
        }

        return this.utils.allPromises(promises).finally(() => {
            this.prefetchIconsInitialized = false;
        });
    }

    /**
     * Fetch the courses for my overview.
     *
     * @return Promise resolved when done.
     */
    protected fetchContent(): Promise<any> {
        const config = this.block.configs;

        const showCategories = config && config.displaycategories && config.displaycategories.value == '1';

        return this.coursesHelper.getUserCoursesWithOptions(this.sort, null, null, showCategories).then((courses) => {
            this.courseIds = courses.map((course) => {
                    return course.id;
                });

            this.showSortFilter = courses.length > 0 && typeof courses[0].lastaccess != 'undefined';

            this.initCourseFilters(courses);

            this.showSelectorFilter = courses.length > 0 && (this.courses.past.length > 0 || this.courses.future.length > 0 ||
                   typeof courses[0].enddate != 'undefined');

            this.courses.filter = '';
            this.showFilter = false;

            this.showFilters.all = this.getShowFilterValue(!config || config.displaygroupingall.value == '1',
                    this.courses.all.length === 0);
            // Do not show allincludinghiddenif config it's not present (before 3.8).
            this.showFilters.allincludinghidden =
                this.getShowFilterValue(config && config.displaygroupingallincludinghidden.value == '1',
                    this.courses.allincludinghidden.length === 0);

            this.showFilters.inprogress = this.getShowFilterValue(!config || config.displaygroupinginprogress.value == '1',
                this.courses.inprogress.length === 0);
            this.showFilters.past = this.getShowFilterValue(!config || config.displaygroupingpast.value == '1',
                this.courses.past.length === 0);
            this.showFilters.future = this.getShowFilterValue(!config || config.displaygroupingfuture.value == '1',
                this.courses.future.length === 0);

            this.showSelectorFilter = courses.length > 0 && (this.courses.past.length > 0 || this.courses.future.length > 0 ||
                   typeof courses[0].enddate != 'undefined');

            this.showFilters.hidden = this.getShowFilterValue(
                this.showSelectorFilter && typeof courses[0].hidden != 'undefined' &&
                    (!config || config.displaygroupinghidden.value == '1'),
                this.courses.hidden.length === 0);

            this.showFilters.favourite = this.getShowFilterValue(
                this.showSelectorFilter && typeof courses[0].isfavourite != 'undefined' &&
                    (!config || config.displaygroupingstarred.value == '1'),
                this.courses.favourite.length === 0);

            this.showFilters.custom = this.getShowFilterValue(this.showSelectorFilter && config &&
                    config.displaygroupingcustomfield.value == '1' && config.customfieldsexport && config.customfieldsexport.value,
                    false);
            if (this.showFilters.custom == 'show') {
                this.customFilter = this.textUtils.parseJSON(config.customfieldsexport.value);
            } else {
                this.customFilter = [];
            }

            if (this.showSelectorFilter) {
                // Check if any selector is shown and not disabled.
                this.showSelectorFilter = Object.keys(this.showFilters).some((key) => {
                    return this.showFilters[key] == 'show';
                });
            }

            if (!this.showSelectorFilter || (this.selectedFilter === 'inprogress' && this.showFilters.inprogress == 'disabled')) {
                // No selector, or the default option is disabled, show all.
                this.selectedFilter = 'all';
            }
            this.setCourseFilter(this.selectedFilter);

            this.initPrefetchCoursesIcons();
        });
    }

    /**
     * Helper function to help with filter values.
     *
     * @param  showCondition     If true, filter will be shown.
     * @param  disabledCondition If true, and showCondition is also met, it will be shown as disabled.
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
    filterChanged(event: any): void {
        const newValue = event.target.value && event.target.value.trim().toLowerCase();
        if (!newValue || this.courses.allincludinghidden.length <= 0) {
            this.filteredCourses = this.courses.allincludinghidden;
        } else {
            // Use displayname if avalaible, or fullname if not.
            if (this.courses.allincludinghidden.length > 0 &&
                    typeof this.courses.allincludinghidden[0].displayname != 'undefined') {
                this.filteredCourses = this.courses.allincludinghidden.filter((course) => {
                    return course.displayname.toLowerCase().indexOf(newValue) > -1;
                });
            } else {
                this.filteredCourses = this.courses.allincludinghidden.filter((course) => {
                    return course.fullname.toLowerCase().indexOf(newValue) > -1;
                });
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

        Object.keys(this.prefetchCoursesData).forEach((filter) => {
            this.courseHelper.initPrefetchCoursesIcons(this.courses[filter], this.prefetchCoursesData[filter]).then((prefetch) => {
                this.prefetchCoursesData[filter] = prefetch;
            });
        });
    }

    /**
     * Prefetch all the shown courses.
     *
     * @return Promise resolved when done.
     */
    prefetchCourses(): Promise<any> {
        const selected = this.selectedFilter,
            initialIcon = this.prefetchCoursesData[selected].icon;

        return this.courseHelper.prefetchCourses(this.courses[selected], this.prefetchCoursesData[selected]).catch((error) => {
            if (!this.isDestroyed) {
                this.domUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
                this.prefetchCoursesData[selected].icon = initialIcon;
            }
        });
    }

    /**
     * The selected courses filter have changed.
     */
    selectedChanged(): void {
        this.setCourseFilter(this.selectedFilter);
    }

    /**
     * Set selected courses filter.
     *
     * @param filter Filter name to set.
     */
    protected setCourseFilter(filter: string): void {
        this.selectedFilter = filter;

        if (this.showFilters.custom == 'show' && filter.startsWith('custom-') &&
                typeof this.customFilter[filter.substr(7)] != 'undefined') {
            const filterName = this.block.configs.customfiltergrouping.value,
                filterValue = this.customFilter[filter.substr(7)].value;

            this.loaded = false;

            this.coursesProvider.getEnrolledCoursesByCustomField(filterName, filterValue).then((courses) => {
                // Get the courses information from allincludinghidden to get the max info about the course.
                const courseIds = courses.map((course) => course.id);
                this.filteredCourses = this.courses.allincludinghidden.filter((allCourse) =>
                    courseIds.indexOf(allCourse.id) !== -1);
            }).catch((error) => {
                this.domUtils.showErrorModalDefault(error, this.fetchContentDefaultError);
            }).finally(() => {
                this.loaded = true;
            });
        } else {
            // Only save the filter if not a custom one.
            this.currentSite.setLocalSiteConfig('AddonBlockMyOverviewFilter', filter);

            if (this.showFilters[filter] == 'show') {
                this.filteredCourses = this.courses[filter];
            } else {
                const activeFilter = Object.keys(this.showFilters).find((name) => {
                    return this.showFilters[name] == 'show';
                });

                if (activeFilter) {
                    this.setCourseFilter(activeFilter);
                }
            }
        }
    }

    /**
     * Init courses filters.
     *
     * @param courses Courses to filter.
     */
    initCourseFilters(courses: any[]): void {
        this.courses.allincludinghidden = courses;

        if (this.showSortFilter) {
                if (this.sort == 'lastaccess') {
                courses.sort((a, b) => {
                    return b.lastaccess - a.lastaccess;
                });
            } else if (this.sort == 'fullname') {
                courses.sort((a, b) => {
                    const compareA = a.fullname.toLowerCase(),
                        compareB = b.fullname.toLowerCase();

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

        const today = this.timeUtils.timestamp();
        courses.forEach((course) => {
            if (course.hidden) {
                this.courses.hidden.push(course);
            } else  {
                this.courses.all.push(course);

                if ((course.enddate && course.enddate < today) || course.completed) {
                    // Courses that have already ended.
                    this.courses.past.push(course);
                } else if (course.startdate > today) {
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
        this.currentSite.setLocalSiteConfig('AddonBlockMyOverviewSort', this.sort);
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
                this.searchbar.setFocus();
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
        this.coursesObserver && this.coursesObserver.off();
        this.updateSiteObserver && this.updateSiteObserver.off();
    }
}
