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

import { Component, OnInit, Input, OnDestroy, ViewChild, Injector, OnChanges, SimpleChange } from '@angular/core';
import { Searchbar } from 'ionic-angular';
import { CoreEventsProvider } from '@providers/events';
import { CoreUtilsProvider } from '@providers/utils/utils';
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
        past: [],
        inprogress: [],
        future: [],
        favourite: [],
        hidden: []
    };
    selectedFilter = 'inprogress';
    sort = 'fullname';
    currentSite: any;
    filteredCourses: any[];
    prefetchCoursesData = {
        all: {},
        inprogress: {},
        past: {},
        future: {},
        favourite: {},
        hidden: {}
    };
    showFilter = false;
    showFavourite = false;
    showHidden = false;
    showSelectorFilter = false;
    showSortFilter = false;
    downloadCourseEnabled: boolean;
    downloadCoursesEnabled: boolean;
    disableInProgress = false;
    disablePast = false;
    disableFuture = false;
    disableFavourite = false;
    disableHidden = false;

    protected prefetchIconsInitialized = false;
    protected isDestroyed;
    protected coursesObserver;
    protected updateSiteObserver;
    protected courseIds = [];
    protected fetchContentDefaultError = 'Error getting my overview data.';

    constructor(injector: Injector, private coursesProvider: CoreCoursesProvider,
            private courseCompletionProvider: AddonCourseCompletionProvider, private eventsProvider: CoreEventsProvider,
            private courseHelper: CoreCourseHelperProvider, private utils: CoreUtilsProvider,
            private courseOptionsDelegate: CoreCourseOptionsDelegate, private coursesHelper: CoreCoursesHelperProvider,
            private sitesProvider: CoreSitesProvider, private timeUtils: CoreTimeUtilsProvider) {

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
            this.selectedFilter = typeof this.courses[value] == 'undefined' ? 'inprogress' : value;
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
     * @return {Promise<any>} Resolved when done.
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
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(): Promise<any> {
        return this.coursesHelper.getUserCoursesWithOptions(this.sort).then((courses) => {
            this.courseIds = courses.map((course) => {
                    return course.id;
                });

            this.showSortFilter = courses.length > 0 && typeof courses[0].lastaccess != 'undefined';

            this.initCourseFilters(courses);

            this.courses.filter = '';
            this.showFilter = false;
            this.disableInProgress = this.courses.inprogress.length === 0;
            this.disablePast = this.courses.past.length === 0;
            this.disableFuture = this.courses.future.length === 0;
            this.showSelectorFilter = courses.length > 0 && (this.courses.past.length > 0 || this.courses.future.length > 0 ||
                   typeof courses[0].enddate != 'undefined');
            this.showHidden = this.showSelectorFilter && typeof courses[0].hidden != 'undefined';
            this.disableHidden = this.courses.hidden.length === 0;
            this.showFavourite = this.showSelectorFilter && typeof courses[0].isfavourite != 'undefined';
            this.disableFavourite = this.courses.favourite.length === 0;
            if (!this.showSelectorFilter || (this.selectedFilter === 'inprogress' && this.disableInProgress)) {
                // No selector, or the default option is disabled, show all.
                this.selectedFilter = 'all';
            }
            this.filteredCourses = this.courses[this.selectedFilter];

            this.initPrefetchCoursesIcons();
        });
    }

    /**
     * The filter has changed.
     *
     * @param {any} Received Event.
     */
    filterChanged(event: any): void {
        const newValue = event.target.value && event.target.value.trim().toLowerCase();
        if (!newValue || !this.courses['all']) {
            this.filteredCourses = this.courses['all'];
        } else {
            // Use displayname if avalaible, or fullname if not.
            if (this.courses['all'].length > 0 &&
                    typeof this.courses['all'][0].displayname != 'undefined') {
                this.filteredCourses = this.courses['all'].filter((course) => {
                    return course.displayname.toLowerCase().indexOf(newValue) > -1;
                });
            } else {
                this.filteredCourses = this.courses['all'].filter((course) => {
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
     * @return {Promise<any>} Promise resolved when done.
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
        this.currentSite.setLocalSiteConfig('AddonBlockMyOverviewFilter', this.selectedFilter);
        this.filteredCourses = this.courses[this.selectedFilter];
    }

    /**
     * Init courses filters.
     *
     * @param {any[]} courses Courses to filter.
     */
    initCourseFilters(courses: any[]): void {
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

        this.filteredCourses = this.courses[this.selectedFilter];
    }

    /**
     * The selected courses sort filter have changed.
     *
     * @param {string} sort New sorting.
     */
    switchSort(sort: string): void {
        this.sort = sort;
        this.currentSite.setLocalSiteConfig('AddonBlockMyOverviewSort', this.sort);
        this.initCourseFilters(this.courses.all.concat(this.courses.hidden));
    }

    /**
     * Show or hide the filter.
     */
    switchFilter(): void {
        this.showFilter = !this.showFilter;
        this.courses.filter = '';
        this.filteredCourses = this.courses[this.showFilter ? 'all' : this.selectedFilter];
        if (this.showFilter) {
            setTimeout(() => {
                this.searchbar.setFocus();
            }, 500);
        }
    }

    /**
     * If switch button that enables the filter input is shown or not.
     *
     * @return {boolean} If switch button that enables the filter input is shown or not.
     */
    showFilterSwitchButton(): boolean {
        return this.loaded && this.courses['all'] && this.courses['all'].length > 5;
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
