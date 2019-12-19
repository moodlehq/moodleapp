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

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Searchbar } from 'ionic-angular';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreCoursesProvider } from '../../providers/courses';
import { CoreCoursesHelperProvider } from '../../providers/helper';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreCourseOptionsDelegate } from '@core/course/providers/options-delegate';

/**
 * Component that displays the list of courses the user is enrolled in.
 */
@Component({
    selector: 'core-courses-my-courses',
    templateUrl: 'my-courses.html',
})
export class CoreCoursesMyCoursesComponent implements OnInit, OnDestroy {
    @ViewChild('searchbar') searchbar: Searchbar;

    courses: any[];
    filteredCourses: any[];
    searchEnabled: boolean;
    filter = '';
    showFilter = false;
    coursesLoaded = false;
    prefetchCoursesData: any = {};
    downloadAllCoursesEnabled: boolean;

    protected prefetchIconInitialized = false;
    protected myCoursesObserver;
    protected siteUpdatedObserver;
    protected isDestroyed = false;
    protected courseIds = '';

    constructor(private coursesProvider: CoreCoursesProvider,
            private domUtils: CoreDomUtilsProvider, private eventsProvider: CoreEventsProvider,
            private sitesProvider: CoreSitesProvider, private courseHelper: CoreCourseHelperProvider,
            private courseOptionsDelegate: CoreCourseOptionsDelegate, private coursesHelper: CoreCoursesHelperProvider) { }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.searchEnabled = !this.coursesProvider.isSearchCoursesDisabledInSite();
        this.downloadAllCoursesEnabled = !this.coursesProvider.isDownloadCoursesDisabledInSite();

        this.fetchCourses().finally(() => {
            this.coursesLoaded = true;
        });

        this.myCoursesObserver = this.eventsProvider.on(CoreCoursesProvider.EVENT_MY_COURSES_UPDATED, () => {
            this.fetchCourses();
        }, this.sitesProvider.getCurrentSiteId());

        // Refresh the enabled flags if site is updated.
        this.siteUpdatedObserver = this.eventsProvider.on(CoreEventsProvider.SITE_UPDATED, () => {
            const wasEnabled = this.downloadAllCoursesEnabled;

            this.searchEnabled = !this.coursesProvider.isSearchCoursesDisabledInSite();
            this.downloadAllCoursesEnabled = !this.coursesProvider.isDownloadCoursesDisabledInSite();

            if (!wasEnabled && this.downloadAllCoursesEnabled && this.coursesLoaded) {
                // Download all courses is enabled now, initialize it.
                this.initPrefetchCoursesIcon();
            }
        }, this.sitesProvider.getCurrentSiteId());
    }

    /**
     * Fetch the user courses.
     *
     * @return Promise resolved when done.
     */
    protected fetchCourses(): Promise<any> {
        return this.coursesProvider.getUserCourses().then((courses) => {
            const promises = [],
                courseIds = courses.map((course) => {
                return course.id;
            });

            this.courseIds = courseIds.join(',');

            promises.push(this.coursesHelper.loadCoursesExtraInfo(courses));

            if (this.coursesProvider.canGetAdminAndNavOptions()) {
                promises.push(this.coursesProvider.getCoursesAdminAndNavOptions(courseIds).then((options) => {
                    courses.forEach((course) => {
                        course.navOptions = options.navOptions[course.id];
                        course.admOptions = options.admOptions[course.id];
                    });
                }));
            }

            return Promise.all(promises).then(() => {
                this.courses = courses;
                this.filteredCourses = this.courses;
                this.filter = '';

                this.initPrefetchCoursesIcon();
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.courses.errorloadcourses', true);
        });
    }

    /**
     * Refresh the courses.
     *
     * @param refresher Refresher.
     */
    refreshCourses(refresher: any): void {
        const promises = [];

        promises.push(this.coursesProvider.invalidateUserCourses());
        promises.push(this.courseOptionsDelegate.clearAndInvalidateCoursesOptions());
        if (this.courseIds) {
            promises.push(this.coursesProvider.invalidateCoursesByField('ids', this.courseIds));
        }

        Promise.all(promises).finally(() => {

            this.prefetchIconInitialized = false;
            this.fetchCourses().finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * Show or hide the filter.
     */
    switchFilter(): void {
        this.filter = '';
        this.showFilter = !this.showFilter;
        this.filteredCourses = this.courses;
        if (this.showFilter) {
            setTimeout(() => {
                this.searchbar.setFocus();
            }, 500);
        }
    }

    /**
     * The filter has changed.
     *
     * @param Received Event.
     */
    filterChanged(event: any): void {
        const newValue = event.target.value && event.target.value.trim().toLowerCase();
        if (!newValue || !this.courses) {
            this.filteredCourses = this.courses;
        } else {
            // Use displayname if avalaible, or fullname if not.
            if (this.courses.length > 0 && typeof this.courses[0].displayname != 'undefined') {
                this.filteredCourses = this.courses.filter((course) => {
                    return course.displayname.toLowerCase().indexOf(newValue) > -1;
                });
            } else {
                this.filteredCourses = this.courses.filter((course) => {
                    return course.fullname.toLowerCase().indexOf(newValue) > -1;
                });
            }
        }
    }

    /**
     * Prefetch all the courses.
     *
     * @return Promise resolved when done.
     */
    prefetchCourses(): Promise<any> {
        const initialIcon = this.prefetchCoursesData.icon;

        this.prefetchCoursesData.icon = 'spinner';
        this.prefetchCoursesData.badge = '';

        return this.courseHelper.confirmAndPrefetchCourses(this.courses, (progress) => {
            this.prefetchCoursesData.badge = progress.count + ' / ' + progress.total;
        }).then(() => {
            this.prefetchCoursesData.icon = 'ion-android-refresh';
        }).catch((error) => {
            if (!this.isDestroyed) {
                this.domUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
                this.prefetchCoursesData.icon = initialIcon;
            }
        }).finally(() => {
            this.prefetchCoursesData.badge = '';
        });
    }

    /**
     * Initialize the prefetch icon for the list of courses.
     */
    protected initPrefetchCoursesIcon(): void {
        if (this.prefetchIconInitialized || !this.downloadAllCoursesEnabled) {
            // Already initialized.
            return;
        }

        this.prefetchIconInitialized = true;

        if (!this.courses || this.courses.length < 2) {
            // Not enough courses.
            this.prefetchCoursesData.icon = '';

            return;
        }

        this.courseHelper.determineCoursesStatus(this.courses).then((status) => {
            let icon = this.courseHelper.getCourseStatusIconAndTitleFromStatus(status).icon;
            if (icon == 'spinner') {
                // It seems all courses are being downloaded, show a download button instead.
                icon = 'cloud-download';
            }
            this.prefetchCoursesData.icon = icon;
        });
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.myCoursesObserver && this.myCoursesObserver.off();
        this.siteUpdatedObserver && this.siteUpdatedObserver.off();
    }
}
