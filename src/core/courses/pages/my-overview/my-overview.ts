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
import { CoreSitesProvider } from '../../../../providers/sites';
import { CoreDomUtilsProvider } from '../../../../providers/utils/dom';
import { CoreCoursesProvider } from '../../providers/courses';
import { CoreCoursesMyOverviewProvider } from '../../providers/my-overview';
import { CoreCourseHelperProvider } from '../../../course/providers/helper';
import { CoreCourseOptionsDelegate } from '../../../course/providers/options-delegate';
import { CoreSiteHomeProvider } from '../../../sitehome/providers/sitehome';
import * as moment from 'moment';

/**
 * Page that displays My Overview.
 */
@IonicPage({ segment: 'core-courses-my-overview' })
@Component({
    selector: 'page-core-courses-my-overview',
    templateUrl: 'my-overview.html',
})
export class CoreCoursesMyOverviewPage implements OnDestroy {
    firstSelectedTab: number;
    siteHomeEnabled: boolean;
    tabsReady = false;
    tabShown = 'courses';
    timeline = {
        sort: 'sortbydates',
        events: [],
        loaded: false,
        canLoadMore: undefined
    };
    timelineCourses = {
        courses: [],
        loaded: false,
        canLoadMore: false
    };
    courses = {
        selected: 'inprogress',
        loaded: false,
        filter: '',
        past: [],
        inprogress: [],
        future: []
    };
    showFilter = false;
    searchEnabled: boolean;
    filteredCourses: any[];
    tabs = [];
    prefetchCoursesData = {
        inprogress: {},
        past: {},
        future: {}
    };

    protected prefetchIconsInitialized = false;
    protected isDestroyed;

    constructor(private navCtrl: NavController, private coursesProvider: CoreCoursesProvider,
            private domUtils: CoreDomUtilsProvider, private myOverviewProvider: CoreCoursesMyOverviewProvider,
            private courseHelper: CoreCourseHelperProvider, private sitesProvider: CoreSitesProvider,
            private siteHomeProvider: CoreSiteHomeProvider, private courseOptionsDelegate: CoreCourseOptionsDelegate) { }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.searchEnabled = !this.coursesProvider.isSearchCoursesDisabledInSite();

        // Decide which tab to load first.
        this.siteHomeProvider.isAvailable().then((enabled) => {
            const site = this.sitesProvider.getCurrentSite(),
                displaySiteHome = site.getInfo() && site.getInfo().userhomepage === 0;

            this.siteHomeEnabled = enabled;
            this.firstSelectedTab = displaySiteHome ? 0 : 2;
            this.tabsReady = true;
        });
    }

    /**
     * Fetch the timeline.
     *
     * @param {number} [afterEventId] The last event id.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchMyOverviewTimeline(afterEventId?: number): Promise<any> {
        return this.myOverviewProvider.getActionEventsByTimesort(afterEventId).then((events) => {
            this.timeline.events = events.events;
            this.timeline.canLoadMore = events.canLoadMore;
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error getting my overview data.');
        });
    }

    /**
     * Fetch the timeline by courses.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchMyOverviewTimelineByCourses(): Promise<any> {
        return this.fetchUserCourses().then((courses) => {
            const today = moment().unix();
            let courseIds;
            courses = courses.filter((course) => {
                return course.startdate <= today && (!course.enddate || course.enddate >= today);
            });

            this.timelineCourses.courses = courses;
            if (courses.length > 0) {
                courseIds = courses.map((course) => {
                    return course.id;
                });

                return this.myOverviewProvider.getActionEventsByCourses(courseIds).then((courseEvents) => {
                    this.timelineCourses.courses.forEach((course) => {
                        course.events = courseEvents[course.id].events;
                        course.canLoadMore = courseEvents[course.id].canLoadMore;
                    });
                });
            }
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error getting my overview data.');
        });
    }

    /**
     * Fetch the courses for my overview.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchMyOverviewCourses(): Promise<any> {
        return this.fetchUserCourses().then((courses) => {
            const today = moment().unix();

            this.courses.past = [];
            this.courses.inprogress = [];
            this.courses.future = [];

            courses.forEach((course) => {
                if (course.startdate > today) {
                    // Courses that have not started yet.
                    this.courses.future.push(course);
                } else if (course.enddate && course.enddate < today) {
                    // Courses that have already ended.
                    this.courses.past.push(course);
                } else {
                    // Courses still in progress.
                    this.courses.inprogress.push(course);
                }
            });

            this.courses.filter = '';
            this.showFilter = false;
            this.filteredCourses = this.courses[this.courses.selected];

            this.initPrefetchCoursesIcons();
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error getting my overview data.');
        });
    }

    /**
     * Fetch user courses.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchUserCourses(): Promise<any> {
        return this.coursesProvider.getUserCourses().then((courses) => {
            const courseIds = courses.map((course) => {
                return course.id;
            });

            // Load course options of the course.
            return this.coursesProvider.getCoursesAdminAndNavOptions(courseIds).then((options) => {
                courses.forEach((course) => {
                    course.navOptions = options.navOptions[course.id];
                    course.admOptions = options.admOptions[course.id];
                });

                return courses.sort((a, b) => {
                    const compareA = a.fullname.toLowerCase(),
                        compareB = b.fullname.toLowerCase();

                    return compareA.localeCompare(compareB);
                });
            });
        });
    }

    /**
     * Show or hide the filter.
     */
    switchFilter(): void {
        this.showFilter = !this.showFilter;
        this.courses.filter = '';
        this.filteredCourses = this.courses[this.courses.selected];
    }

    /**
     * The filter has changed.
     *
     * @param {string} newValue New filter value.
     */
    filterChanged(newValue: string): void {
        if (!newValue || !this.courses[this.courses.selected]) {
            this.filteredCourses = this.courses[this.courses.selected];
        } else {
            this.filteredCourses = this.courses[this.courses.selected].filter((course) => {
                return course.fullname.toLowerCase().indexOf(newValue.toLowerCase()) > -1;
            });
        }
    }

    /**
     * Refresh the data.
     *
     * @param {any} refresher Refresher.
     * @return {Promise<any>} Promise resolved when done.
     */
    refreshMyOverview(refresher: any): Promise<any> {
        const promises = [];

        if (this.tabShown == 'timeline') {
            promises.push(this.myOverviewProvider.invalidateActionEventsByTimesort());
            promises.push(this.myOverviewProvider.invalidateActionEventsByCourses());
        }

        promises.push(this.coursesProvider.invalidateUserCourses());
        promises.push(this.courseOptionsDelegate.clearAndInvalidateCoursesOptions());

        return Promise.all(promises).finally(() => {
            switch (this.tabShown) {
                case 'timeline':
                    switch (this.timeline.sort) {
                        case 'sortbydates':
                            return this.fetchMyOverviewTimeline();
                        case 'sortbycourses':
                            return this.fetchMyOverviewTimelineByCourses();
                        default:
                    }
                    break;
                case 'courses':
                    this.prefetchIconsInitialized = false;

                    return this.fetchMyOverviewCourses();
                default:
            }
        }).finally(() => {
            refresher.complete();
        });
    }

    /**
     * Change timeline sort being viewed.
     */
    switchSort(): void {
        switch (this.timeline.sort) {
            case 'sortbydates':
                if (!this.timeline.loaded) {
                    this.fetchMyOverviewTimeline().finally(() => {
                        this.timeline.loaded = true;
                    });
                }
                break;
            case 'sortbycourses':
                if (!this.timelineCourses.loaded) {
                    this.fetchMyOverviewTimelineByCourses().finally(() => {
                        this.timelineCourses.loaded = true;
                    });
                }
                break;
            default:
        }
    }

    /**
     * The tab has changed.
     *
     * @param {string} tab Name of the new tab.
     */
    tabChanged(tab: string): void {
        this.tabShown = tab;
        switch (this.tabShown) {
            case 'timeline':
                if (!this.timeline.loaded) {
                    this.fetchMyOverviewTimeline().finally(() => {
                        this.timeline.loaded = true;
                    });
                }
                break;
            case 'courses':
                if (!this.courses.loaded) {
                    this.fetchMyOverviewCourses().finally(() => {
                        this.courses.loaded = true;
                    });
                }
                break;
            default:
        }
    }

    /**
     * Load more events.
     */
    loadMoreTimeline(): Promise<any> {
        return this.fetchMyOverviewTimeline(this.timeline.canLoadMore);
    }

    /**
     * Load more events.
     *
     * @param {any} course Course.
     * @return {Promise<any>} Promise resolved when done.
     */
    loadMoreCourse(course: any): Promise<any> {
        return this.myOverviewProvider.getActionEventsByCourse(course.id, course.canLoadMore).then((courseEvents) => {
            course.events = course.events.concat(courseEvents.events);
            course.canLoadMore = courseEvents.canLoadMore;
        });
    }

    /**
     * Go to search courses.
     */
    openSearch(): void {
        this.navCtrl.push('CoreCoursesSearchPage');
    }

    /**
     * The selected courses have changed.
     */
    selectedChanged(): void {
        this.filteredCourses = this.courses[this.courses.selected];
    }

    /**
     * Prefetch all the shown courses.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    prefetchCourses(): Promise<any> {
        const selected = this.courses.selected,
            selectedData = this.prefetchCoursesData[selected],
            initialIcon = selectedData.icon;

        selectedData.icon = 'spinner';
        selectedData.badge = '';

        return this.courseHelper.confirmAndPrefetchCourses(this.courses[selected], (progress) => {
            selectedData.badge = progress.count + ' / ' + progress.total;
        }).then((downloaded) => {
            selectedData.icon = downloaded ? 'refresh' : initialIcon;
        }, (error) => {
            if (!this.isDestroyed) {
                this.domUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
                selectedData.icon = initialIcon;
            }
        }).finally(() => {
            selectedData.badge = '';
        });
    }

    /**
     * Initialize the prefetch icon for selected courses.
     */
    protected initPrefetchCoursesIcons(): void {
        if (this.prefetchIconsInitialized) {
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
                let icon = this.courseHelper.getCourseStatusIconFromStatus(status);
                if (icon == 'spinner') {
                    // It seems all courses are being downloaded, show a download button instead.
                    icon = 'cloud-download';
                }
                this.prefetchCoursesData[filter].icon = icon;
            });

        });
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
    }
}
