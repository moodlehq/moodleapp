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

import { Component, OnDestroy } from '@angular/core';
import { IonicPage, NavController } from 'ionic-angular';
import { CoreEventsProvider } from '../../../../providers/events';
import { CoreSitesProvider } from '../../../../providers/sites';
import { CoreDomUtilsProvider } from '../../../../providers/utils/dom';
import { CoreCoursesProvider } from '../../providers/courses';
import { CoreCourseHelperProvider } from '../../../course/providers/helper';
import { CoreCourseOptionsDelegate } from '../../../course/providers/options-delegate';

/**
 * Page that displays the list of courses the user is enrolled in.
 */
@IonicPage({segment: "core-courses-my-courses"})
@Component({
    selector: 'page-core-courses-my-courses',
    templateUrl: 'my-courses.html',
})
export class CoreCoursesMyCoursesPage implements OnDestroy {
    courses: any[];
    filteredCourses: any[];
    searchEnabled: boolean;
    filter = '';
    showFilter = false;
    coursesLoaded = false;
    prefetchCoursesData: any = {};

    protected prefetchIconInitialized = false;
    protected myCoursesObserver;
    protected siteUpdatedObserver;
    protected isDestroyed = false;

    constructor(private navCtrl: NavController, private coursesProvider: CoreCoursesProvider,
            private domUtils: CoreDomUtilsProvider, private eventsProvider: CoreEventsProvider,
            private sitesProvider: CoreSitesProvider, private courseHelper: CoreCourseHelperProvider,
            private courseOptionsDelegate: CoreCourseOptionsDelegate) {}

    /**
     * View loaded.
     */
    ionViewDidLoad() {
        this.searchEnabled = !this.coursesProvider.isSearchCoursesDisabledInSite();

        this.fetchCourses().finally(() => {
            this.coursesLoaded = true;
        });

        this.myCoursesObserver = this.eventsProvider.on(CoreCoursesProvider.EVENT_MY_COURSES_UPDATED, () => {
            this.fetchCourses();
        }, this.sitesProvider.getCurrentSiteId());

        this.siteUpdatedObserver = this.eventsProvider.on(CoreEventsProvider.SITE_UPDATED, () => {
            this.searchEnabled = !this.coursesProvider.isSearchCoursesDisabledInSite();
        }, this.sitesProvider.getCurrentSiteId());
    }

    /**
     * Fetch the user courses.
     */
    protected fetchCourses() {
        return this.coursesProvider.getUserCourses().then((courses) => {

            const courseIds = courses.map((course) => {
                return course.id;
            });

            return this.coursesProvider.getCoursesAdminAndNavOptions(courseIds).then((options) => {
                courses.forEach((course) => {
                    course.navOptions = options.navOptions[course.id];
                    course.admOptions = options.admOptions[course.id];
                });
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
     * @param {any} refresher Refresher.
     */
    refreshCourses(refresher: any) {
        let promises = [];

        promises.push(this.coursesProvider.invalidateUserCourses());
        promises.push(this.courseOptionsDelegate.clearAndInvalidateCoursesOptions());

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
    switchFilter() {
        this.filter = '';
        this.showFilter = !this.showFilter;
        this.filteredCourses = this.courses;
    }

    /**
     * Go to search courses.
     */
    openSearch() {
        this.navCtrl.push('CoreCoursesSearchPage');
    }

    /**
     * The filter has changed.
     *
     * @param {string} newValue New filter value.
     */
    filterChanged(newValue: string) {
        if (!newValue || !this.courses) {
            this.filteredCourses = this.courses;
        } else {
            this.filteredCourses = this.courses.filter((course) => {
                return course.fullname.indexOf(newValue) > -1;
            });
        }
    }

    /**
     * Prefetch all the courses.
     */
    prefetchCourses() {
        let initialIcon = this.prefetchCoursesData.icon;

        this.prefetchCoursesData.icon = 'spinner';
        this.prefetchCoursesData.badge = '';
        return this.courseHelper.confirmAndPrefetchCourses(this.courses, (progress) => {
            this.prefetchCoursesData.badge = progress.count + ' / ' + progress.total;
        }).then((downloaded) => {
            this.prefetchCoursesData.icon = downloaded ? 'ion-android-refresh' : initialIcon;
        }, (error) => {
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
    protected initPrefetchCoursesIcon() {
        if (this.prefetchIconInitialized) {
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
            let icon = this.courseHelper.getCourseStatusIconFromStatus(status);
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
    ngOnDestroy() {
        this.isDestroyed = true;
        this.myCoursesObserver && this.myCoursesObserver.off();
        this.siteUpdatedObserver && this.siteUpdatedObserver.off();
    }
}
