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

import { Component, OnInit, OnDestroy, ViewChild, Injector } from '@angular/core';
import { Searchbar } from 'ionic-angular';
import * as moment from 'moment';
import { CoreEventsProvider } from '@providers/events';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreCoursesHelperProvider } from '@core/courses/providers/helper';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreCourseOptionsDelegate } from '@core/course/providers/options-delegate';
import { AddonCourseCompletionProvider } from '@addon/coursecompletion/providers/coursecompletion';
import { AddonBlockComponent } from '../../classes/block-component';

/**
 * Component to render a my overview block.
 */
@Component({
    selector: 'addon-block-myoverview',
    templateUrl: 'addon-block-myoverview.html'
})
export class AddonBlockMyOverviewComponent extends AddonBlockComponent implements OnInit, OnDestroy {
    @ViewChild('searchbar') searchbar: Searchbar;

    courses = {
        filter: '',
        all: [],
        past: [],
        inprogress: [],
        future: []
    };
    selectedFilter = 'inprogress';
    downloadAllCoursesEnabled: boolean;
    filteredCourses: any[];
    prefetchCoursesData = {
        all: {},
        inprogress: {},
        past: {},
        future: {}
    };
    showFilter = false;
    showSelectorFilter = false;

    protected prefetchIconsInitialized = false;
    protected isDestroyed;
    protected updateSiteObserver;
    protected courseIds = [];
    protected fetchContentDefaultError = 'Error getting my overview data.';

    constructor(injector: Injector, private coursesProvider: CoreCoursesProvider,
            private courseCompletionProvider: AddonCourseCompletionProvider, private eventsProvider: CoreEventsProvider,
            private courseHelper: CoreCourseHelperProvider, private utils: CoreUtilsProvider,
            private courseOptionsDelegate: CoreCourseOptionsDelegate, private coursesHelper: CoreCoursesHelperProvider) {

        super(injector, 'AddonBlockMyOverviewComponent');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.downloadAllCoursesEnabled = !this.coursesProvider.isDownloadCoursesDisabledInSite();

        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = this.eventsProvider.on(CoreEventsProvider.SITE_UPDATED, () => {
            const wasEnabled = this.downloadAllCoursesEnabled;

            this.downloadAllCoursesEnabled = !this.coursesProvider.isDownloadCoursesDisabledInSite();

            if (!wasEnabled && this.downloadAllCoursesEnabled && this.loaded) {
                // Download all courses is enabled now, initialize it.
                this.initPrefetchCoursesIcons();
            }
        });

        super.ngOnInit();
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
        return this.coursesHelper.getUserCoursesWithOptions().then((courses) => {
            // Fetch course completion status.
            return Promise.all(courses.map((course) => {
                if (typeof course.enablecompletion != 'undefined' && course.enablecompletion == 0) {
                    // Completion is disabled for this course, there is no need to fetch the completion status.
                    return Promise.resolve(course);
                }

                return this.courseCompletionProvider.getCompletion(course.id).catch(() => {
                    // Ignore error, maybe course compleiton is disabled or user ha no permission.
                }).then((completion) => {
                    course.completed = completion && completion.completed;

                    return course;
                });
            }));
        }).then((courses) => {
            const today = moment().unix();

            this.courses.all = courses;
            this.courses.past = [];
            this.courses.inprogress = [];
            this.courses.future = [];

            courses.forEach((course) => {
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
            });

            this.courses.filter = '';
            this.showFilter = false;
            this.showSelectorFilter = (this.courses.past.length + this.courses.future.length) > 0;
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
        if (!newValue || !this.courses[this.selectedFilter]) {
            this.filteredCourses = this.courses[this.selectedFilter];
        } else {
            this.filteredCourses = this.courses[this.selectedFilter].filter((course) => {
                return course.fullname.toLowerCase().indexOf(newValue) > -1;
            });
        }
    }

    /**
     * Initialize the prefetch icon for selected courses.
     */
    protected initPrefetchCoursesIcons(): void {
        if (this.prefetchIconsInitialized || !this.downloadAllCoursesEnabled) {
            // Already initialized.
            return;
        }

        this.prefetchIconsInitialized = true;

        Object.keys(this.prefetchCoursesData).forEach((filter) => {
            if (!this.courses[filter] || this.courses[filter].length < 2) {
                // Not enough courses.
                this.prefetchCoursesData[filter].icon = '';

                return;
            }

            this.courseHelper.determineCoursesStatus(this.courses[filter]).then((status) => {
                let icon = this.courseHelper.getCourseStatusIconAndTitleFromStatus(status).icon;
                if (icon == 'spinner') {
                    // It seems all courses are being downloaded, show a download button instead.
                    icon = 'cloud-download';
                }
                this.prefetchCoursesData[filter].icon = icon;
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
            selectedData = this.prefetchCoursesData[selected],
            initialIcon = selectedData.icon;

        selectedData.icon = 'spinner';
        selectedData.badge = '';

        return this.courseHelper.confirmAndPrefetchCourses(this.courses[this.selectedFilter], (progress) => {
            selectedData.badge = progress.count + ' / ' + progress.total;
        }).then(() => {
            selectedData.icon = 'refresh';
        }).catch((error) => {
            if (!this.isDestroyed) {
                this.domUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
                selectedData.icon = initialIcon;
            }
        }).finally(() => {
            selectedData.badge = '';
        });
    }

    /**
     * The selected courses have changed.
     */
    selectedChanged(): void {
        this.filteredCourses = this.courses[this.selectedFilter];
    }

    /**
     * Show or hide the filter.
     */
    switchFilter(): void {
        this.showFilter = !this.showFilter;
        this.courses.filter = '';
        this.filteredCourses = this.courses[this.selectedFilter];
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
        return this.loaded && this.courses[this.selectedFilter] && this.courses[this.selectedFilter].length > 5;
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.updateSiteObserver && this.updateSiteObserver.off();
    }
}
