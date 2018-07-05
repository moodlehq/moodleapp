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

import { Component, OnDestroy, ViewChild } from '@angular/core';
import { IonicPage, Searchbar, NavController } from 'ionic-angular';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCoursesProvider } from '../../providers/courses';
import { CoreCoursesMyOverviewProvider } from '../../providers/my-overview';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreCourseOptionsDelegate } from '@core/course/providers/options-delegate';
import { CoreSiteHomeProvider } from '@core/sitehome/providers/sitehome';
import * as moment from 'moment';
import { CoreTabsComponent } from '@components/tabs/tabs';

/**
 * Page that displays My Overview.
 */
@IonicPage({ segment: 'core-courses-my-overview' })
@Component({
    selector: 'page-core-courses-my-overview',
    templateUrl: 'my-overview.html',
})
export class CoreCoursesMyOverviewPage implements OnDestroy {
    @ViewChild(CoreTabsComponent) tabsComponent: CoreTabsComponent;
    @ViewChild('searchbar') searchbar: Searchbar;

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
    downloadAllCoursesEnabled: boolean;
    siteName: string;

    protected prefetchIconsInitialized = false;
    protected isDestroyed;
    protected updateSiteObserver;
    protected courseIds = '';

    constructor(private navCtrl: NavController, private coursesProvider: CoreCoursesProvider,
            private domUtils: CoreDomUtilsProvider, private myOverviewProvider: CoreCoursesMyOverviewProvider,
            private courseHelper: CoreCourseHelperProvider, private sitesProvider: CoreSitesProvider,
            private siteHomeProvider: CoreSiteHomeProvider, private courseOptionsDelegate: CoreCourseOptionsDelegate,
            private eventsProvider: CoreEventsProvider, private utils: CoreUtilsProvider) {
        this.loadSiteName();
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.searchEnabled = !this.coursesProvider.isSearchCoursesDisabledInSite();
        this.downloadAllCoursesEnabled = !this.coursesProvider.isDownloadCoursesDisabledInSite();

        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = this.eventsProvider.on(CoreEventsProvider.SITE_UPDATED, () => {
            const wasEnabled = this.downloadAllCoursesEnabled;

            this.searchEnabled = !this.coursesProvider.isSearchCoursesDisabledInSite();
            this.downloadAllCoursesEnabled = !this.coursesProvider.isDownloadCoursesDisabledInSite();

            if (!wasEnabled && this.downloadAllCoursesEnabled && this.courses.loaded) {
                // Download all courses is enabled now, initialize it.
                this.initPrefetchCoursesIcons();
            }

            this.loadSiteName();
        });

        // Decide which tab to load first.
        this.siteHomeProvider.isAvailable().then((enabled) => {
            const site = this.sitesProvider.getCurrentSite(),
                displaySiteHome = site.getInfo() && site.getInfo().userhomepage === 0;

            this.siteHomeEnabled = enabled;
            this.firstSelectedTab = displaySiteHome ? 0 : 1;
            this.tabsReady = true;
        });
    }

    /**
     * User entered the page.
     */
    ionViewDidEnter(): void {
        this.tabsComponent && this.tabsComponent.ionViewDidEnter();
    }

    /**
     * User left the page.
     */
    ionViewDidLeave(): void {
        this.tabsComponent && this.tabsComponent.ionViewDidLeave();
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
            const promises = [],
                courseIds = courses.map((course) => {
                return course.id;
            });

            if (this.coursesProvider.canGetAdminAndNavOptions()) {
                // Load course options of the course.
                promises.push(this.coursesProvider.getCoursesAdminAndNavOptions(courseIds).then((options) => {
                    courses.forEach((course) => {
                        course.navOptions = options.navOptions[course.id];
                        course.admOptions = options.admOptions[course.id];
                    });
                }));
            }

            this.courseIds = courseIds.join(',');

            if (this.courseIds && this.coursesProvider.isGetCoursesByFieldAvailable()) {
                // Load course image of all the courses.
                promises.push(this.coursesProvider.getCoursesByField('ids', this.courseIds).then((coursesInfo) => {
                    coursesInfo = this.utils.arrayToObject(coursesInfo, 'id');
                    courses.forEach((course) => {
                        if (coursesInfo[course.id] && coursesInfo[course.id].overviewfiles &&
                                coursesInfo[course.id].overviewfiles[0]) {
                            course.imageThumb = coursesInfo[course.id].overviewfiles[0].fileurl;
                        } else {
                            course.imageThumb = false;
                        }
                    });
                }));
            }

            return Promise.all(promises).then(() => {
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
        if (this.showFilter) {
            setTimeout(() => {
                this.searchbar.setFocus();
            });
        }
    }

    /**
     * The filter has changed.
     *
     * @param {any} Received Event.
     */
    filterChanged(event: any): void {
        const newValue = event.target.value && event.target.value.trim().toLowerCase();
        if (!newValue || !this.courses[this.courses.selected]) {
            this.filteredCourses = this.courses[this.courses.selected];
        } else {
            this.filteredCourses = this.courses[this.courses.selected].filter((course) => {
                return course.fullname.toLowerCase().indexOf(newValue) > -1;
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
        if (this.courseIds) {
            promises.push(this.coursesProvider.invalidateCoursesByField('ids', this.courseIds));
        }

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
     * Load the site name.
     */
    protected loadSiteName(): void {
        this.siteName = this.sitesProvider.getCurrentSite().getInfo().sitename;
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.updateSiteObserver && this.updateSiteObserver.off();
    }
}
