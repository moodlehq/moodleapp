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

import { Component, OnDestroy, OnInit } from '@angular/core';
import { CoreCoursesHelper, CoreEnrolledCourseDataWithExtraInfo } from '@features/courses/services/courses-helper';
import { IonRefresher } from '@ionic/angular';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreCourseBasicSearchedData, CoreCourses, CoreCoursesProvider } from '../../services/courses';

type CoreCoursesListMode = 'search' | 'all' | 'my';

/**
 * Page that shows a list of courses.
 */
@Component({
    selector: 'page-core-courses-list',
    templateUrl: 'list.html',
})
export class CoreCoursesListPage implements OnInit, OnDestroy {

    downloadAllCoursesEnabled = false;

    searchEnabled = false;
    searchMode = false;
    searchTotal = 0;

    downloadEnabled = false;
    downloadCourseEnabled = false;
    downloadCoursesEnabled = false;

    courses: (CoreCourseBasicSearchedData|CoreEnrolledCourseDataWithExtraInfo)[] = [];
    loaded = false;
    coursesLoaded = 0;
    canLoadMore = false;
    loadMoreError = false;

    showOnlyEnrolled = false;

    protected loadedCourses: (CoreCourseBasicSearchedData|CoreEnrolledCourseDataWithExtraInfo)[] = [];
    protected loadCoursesPerPage = 20;
    protected currentSiteId: string;
    protected frontpageCourseId: number;
    protected searchPage = 0;
    protected searchText = '';
    protected myCoursesObserver: CoreEventObserver;
    protected siteUpdatedObserver: CoreEventObserver;
    protected downloadEnabledObserver: CoreEventObserver;
    protected courseIds = '';
    protected isDestroyed = false;

    constructor() {
        this.currentSiteId = CoreSites.getRequiredCurrentSite().getId();
        this.frontpageCourseId = CoreSites.getRequiredCurrentSite().getSiteHomeId();

        // Update list if user enrols in a course.
        this.myCoursesObserver = CoreEvents.on(
            CoreCoursesProvider.EVENT_MY_COURSES_UPDATED,
            (data) => {

                if (data.action == CoreCoursesProvider.ACTION_ENROL) {
                    this.fetchCourses();
                }
            },

            this.currentSiteId,
        );

        // Refresh the enabled flags if site is updated.
        this.siteUpdatedObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.searchEnabled = !CoreCourses.isSearchCoursesDisabledInSite();
            this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();
            this.downloadCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();

            this.downloadEnabled = (this.downloadCourseEnabled || this.downloadCoursesEnabled) && this.downloadEnabled;
            if (!this.searchEnabled && this.searchMode) {
                this.searchMode = false;

                this.fetchCourses();
            }
        }, this.currentSiteId);

        this.downloadEnabledObserver = CoreEvents.on(CoreCoursesProvider.EVENT_DASHBOARD_DOWNLOAD_ENABLED_CHANGED, (data) => {
            this.downloadEnabled = (this.downloadCourseEnabled || this.downloadCoursesEnabled) && data.enabled;
        });
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();
        this.downloadCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();

        this.downloadEnabled =
            (this.downloadCourseEnabled || this.downloadCoursesEnabled) && CoreCourses.getCourseDownloadOptionsEnabled();

        const mode = CoreNavigator.getRouteParam<CoreCoursesListMode>('mode') || 'my';

        if (mode == 'search') {
            this.searchMode = true;
        }

        if (mode == 'my') {
            this.showOnlyEnrolled = true;
        }

        this.searchEnabled = !CoreCourses.isSearchCoursesDisabledInSite();
        if (!this.searchEnabled) {
            this.searchMode = false;
        }

        this.fetchCourses();
    }

    /**
     * Load the course list.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchCourses(): Promise<void> {
        try {
            if (this.searchMode) {
                if (this.searchText) {
                    await this.search(this.searchText);
                }
            } else {
                await this.loadCourses(true);
            }
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Fetch the courses.
     *
     * @param clearTheList If list needs to be reloaded.
     * @returns Promise resolved when done.
     */
    protected async loadCourses(clearTheList = false): Promise<void> {
        this.loadMoreError = false;

        try {
            if (clearTheList) {
                if (this.showOnlyEnrolled) {
                    this.loadedCourses = await CoreCourses.getUserCourses();
                } else {
                    const courses = await CoreCourses.getCoursesByField();
                    this.loadedCourses = courses.filter((course) => course.id != this.frontpageCourseId);
                }

                this.coursesLoaded = 0;
                this.courses = [];
            }

            const addCourses = this.loadedCourses.slice(this.coursesLoaded, this.coursesLoaded + this.loadCoursesPerPage);
            await CoreCoursesHelper.loadCoursesExtraInfo(addCourses, true);

            this.courses = this.courses.concat(addCourses);

            this.courseIds = this.courses.map((course) => course.id).join(',');

            this.coursesLoaded = this.courses.length;
            this.canLoadMore = this.loadedCourses.length > this.courses.length;
        } catch (error) {
            this.loadMoreError = true; // Set to prevent infinite calls with infinite-loading.
            !this.isDestroyed && CoreDomUtils.showErrorModalDefault(error, 'core.courses.errorloadcourses', true);
        }

    }

    /**
     * Refresh the courses.
     *
     * @param refresher Refresher.
     */
    refreshCourses(refresher: IonRefresher): void {
        const promises: Promise<void>[] = [];

        if (!this.searchMode) {
            if (this.showOnlyEnrolled) {
                promises.push(CoreCourses.invalidateUserCourses());
            } else {
                promises.push(CoreCourses.invalidateCoursesByField());
            }

            if (this.courseIds) {
                promises.push(CoreCourses.invalidateCoursesByField('ids', this.courseIds));
            }
        }

        Promise.all(promises).finally(() => {
            this.fetchCourses().finally(() => {
                refresher?.complete();
            });
        });
    }

    /**
     * Search a new text.
     *
     * @param text The text to search.
     */
    async search(text: string): Promise<void> {
        this.searchMode = true;
        this.searchText = text;
        this.courses = [];
        this.searchPage = 0;
        this.searchTotal = 0;

        const modal = await CoreDomUtils.showModalLoading('core.searching', true);
        await this.searchCourses().finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Clear search box.
     */
    clearSearch(): void {
        this.searchText = '';
        this.courses = [];
        this.searchPage = 0;
        this.searchTotal = 0;
        this.searchMode = false;

        this.loaded = false;
        this.fetchCourses();
    }

    /**
     * Load more courses.
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     */
    async loadMoreCourses(infiniteComplete?: () => void ): Promise<void> {
        try {
            if (this.searchMode) {
                await this.searchCourses();
            } else {
                await this.loadCourses();
            }
        } finally {
            infiniteComplete && infiniteComplete();
        }
    }

    /**
     * Search courses or load the next page of current search.
     *
     * @returns Promise resolved when done.
     */
    protected async searchCourses(): Promise<void> {
        this.loadMoreError = false;

        try {
            const response = await CoreCourses.search(this.searchText, this.searchPage, undefined, this.showOnlyEnrolled);

            if (this.searchPage === 0) {
                this.courses = response.courses;
            } else {
                this.courses = this.courses.concat(response.courses);
            }
            this.searchTotal = response.total;

            this.searchPage++;
            this.canLoadMore = this.courses.length < this.searchTotal;
        } catch (error) {
            this.loadMoreError = true; // Set to prevent infinite calls with infinite-loading.
            !this.isDestroyed && CoreDomUtils.showErrorModalDefault(error, 'core.courses.errorsearching', true);
        }
    }

    /**
     * Toggle show only my courses.
     */
    toggleEnrolled(): void {
        this.loaded = false;
        this.fetchCourses();
    }

    /**
     * Toggle download enabled.
     */
    toggleDownload(): void {
        CoreCourses.setCourseDownloadOptionsEnabled(this.downloadEnabled);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.myCoursesObserver.off();
        this.siteUpdatedObserver.off();
        this.downloadEnabledObserver.off();
        this.isDestroyed = true;
    }

}
