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

import { Component } from '@angular/core';
import { IonicPage, NavController } from 'ionic-angular';
import { CoreDomUtilsProvider } from '../../../../providers/utils/dom';
import { CoreCoursesProvider } from '../../providers/courses';
import { CoreCoursesMyOverviewProvider } from '../../providers/my-overview';
import * as moment from 'moment';

/**
 * Page that displays My Overview.
 */
@IonicPage()
@Component({
    selector: 'page-core-courses-my-overview',
    templateUrl: 'my-overview.html',
})
export class CoreCoursesMyOverviewPage {
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
    showGrid = true;
    showFilter = false;
    searchEnabled: boolean;
    filteredCourses: any[];

    protected prefetchIconInitialized = false;
    protected myCoursesObserver;
    protected siteUpdatedObserver;

    constructor(private navCtrl: NavController, private coursesProvider: CoreCoursesProvider,
            private domUtils: CoreDomUtilsProvider, private myOverviewProvider: CoreCoursesMyOverviewProvider) {}

    /**
     * View loaded.
     */
    ionViewDidLoad() {
        this.searchEnabled = !this.coursesProvider.isSearchCoursesDisabledInSite();

        this.switchTab(this.tabShown);

        // @todo: Course download.
    }

    /**
     * Fetch the timeline.
     *
     * @param {number} [afterEventId] The last event id.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchMyOverviewTimeline(afterEventId?: number) : Promise<any> {
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
    protected fetchMyOverviewTimelineByCourses() : Promise<any> {
        return this.fetchUserCourses().then((courses) => {
            let today = moment().unix(),
                courseIds;
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
    protected fetchMyOverviewCourses() : Promise<any> {
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
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error getting my overview data.');
        });
    }

    /**
     * Fetch user courses.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchUserCourses() : Promise<any> {
        let courseIds;
        return this.coursesProvider.getUserCourses().then((courses) => {
            courseIds = courses.map((course) => {
                return course.id;
            });

            // Load course options of the course.
            return this.coursesProvider.getCoursesOptions(courseIds).then((options) => {
                courses.forEach((course) => {
                    course.showProgress = true;
                    course.progress = isNaN(parseInt(course.progress, 10)) ? false : parseInt(course.progress, 10);

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
    switchFilter() {
        this.showFilter = !this.showFilter;
        this.courses.filter = '';
        this.filteredCourses = this.courses[this.courses.selected];
    }

    /**
     * The filter has changed.
     *
     * @param {string} newValue New filter value.
     */
    filterChanged(newValue: string) {
        if (!newValue || !this.courses[this.courses.selected]) {
            this.filteredCourses = this.courses[this.courses.selected];
        } else {
            this.filteredCourses = this.courses[this.courses.selected].filter((course) => {
                return course.fullname.indexOf(newValue) > -1;
            });
        }
    }

    /**
     * Switch grid/list view.
     */
    switchGrid() {
        this.showGrid = !this.showGrid;
    }

    /**
     * Refresh the data.
     *
     * @param {any} refresher Refresher.
     */
    refreshMyOverview(refresher: any) {
        let promises = [];

        if (this.tabShown == 'timeline') {
            promises.push(this.myOverviewProvider.invalidateActionEventsByTimesort());
            promises.push(this.myOverviewProvider.invalidateActionEventsByCourses());
        }

        promises.push(this.coursesProvider.invalidateUserCourses());
        // promises.push(this.coursesDelegate.clearAndInvalidateCoursesOptions());

        return Promise.all(promises).finally(() => {
            switch (this.tabShown) {
                case 'timeline':
                    switch (this.timeline.sort) {
                        case 'sortbydates':
                            return this.fetchMyOverviewTimeline();
                        case 'sortbycourses':
                            return this.fetchMyOverviewTimelineByCourses();
                    }
                    break;
                case 'courses':
                    return this.fetchMyOverviewCourses();
            }
        }).finally(() => {
            refresher.complete();
        });
    }

    /**
     * Change timeline sort being viewed.
     */
    switchSort() {
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
        }
    }

    /**
     * Change tab being viewed.
     *
     * @param {string} tab Tab to display.
     */
    switchTab(tab: string) {
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
        }
    }

    /**
     * Load more events.
     */
    loadMoreTimeline() : Promise<any> {
        return this.fetchMyOverviewTimeline(this.timeline.canLoadMore);
    }

    /**
     * Load more events.
     *
     * @param {any} course Course.
     */
    loadMoreCourse(course) {
        return this.myOverviewProvider.getActionEventsByCourse(course.id, course.canLoadMore).then((courseEvents) => {
            course.events = course.events.concat(courseEvents.events);
            course.canLoadMore = courseEvents.canLoadMore;
        });
    }

    /**
     * Go to search courses.
     */
    openSearch() {
        this.navCtrl.push('CoreCoursesSearchPage');
    }
}
