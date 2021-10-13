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
import { IonRefresher } from '@ionic/angular';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreCourseBasicSearchedData, CoreCourses } from '../../services/courses';

type CoreCoursesListMode = 'search' | 'all';

/**
 * Page that shows a list of courses.
 */
@Component({
    selector: 'page-core-courses-list',
    templateUrl: 'list.html',
})
export class CoreCoursesListPage implements OnInit, OnDestroy {

    searchEnabled = false;
    searchMode = false;
    searchCanLoadMore = false;
    searchLoadMoreError = false;
    searchTotal = 0;

    mode: CoreCoursesListMode = 'all';

    courses: CoreCourseBasicSearchedData[] = [];
    coursesLoaded = false;

    protected currentSiteId: string;
    protected frontpageCourseId: number;
    protected searchPage = 0;
    protected searchText = '';
    protected siteUpdatedObserver: CoreEventObserver;

    constructor() {
        this.currentSiteId = CoreSites.getRequiredCurrentSite().getId();
        this.frontpageCourseId = CoreSites.getRequiredCurrentSite().getSiteHomeId();

        // Refresh the enabled flags if site is updated.
        this.siteUpdatedObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.searchEnabled = !CoreCourses.isSearchCoursesDisabledInSite();

            if (!this.searchEnabled) {
                this.searchMode = false;

                this.fetchCourses();
            }
        }, this.currentSiteId);
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.mode = CoreNavigator.getRouteParam<CoreCoursesListMode>('mode') || this.mode;

        if (this.mode == 'search') {
            this.searchMode = true;
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
     * @return Promise resolved when done.
     */
    protected async fetchCourses(): Promise<void> {
        try {
            if (this.searchMode && this.searchText) {
                await this.search(this.searchText);
            } else {
                await this.loadAvailableCourses();
            }
        } finally {
            this.coursesLoaded = true;
        }
    }

    /**
     * Load the courses.
     *
     * @return Promise resolved when done.
     */
    protected async loadAvailableCourses(): Promise<void> {
        try {
            const courses = await CoreCourses.getCoursesByField();

            this.courses = courses.filter((course) => course.id != this.frontpageCourseId);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.courses.errorloadcourses', true);
        }
    }

    /**
     * Refresh the courses.
     *
     * @param refresher Refresher.
     */
    refreshCourses(refresher: IonRefresher): void {
        const promises: Promise<void>[] = [];

        promises.push(CoreCourses.invalidateUserCourses());
        promises.push(CoreCourses.invalidateCoursesByField());

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
        this.searchCourses().finally(() => {
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

        this.coursesLoaded = false;
        this.fetchCourses();
    }

    /**
     * Load more results.
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     */
    loadMoreResults(infiniteComplete?: () => void ): void {
        this.searchCourses().finally(() => {
            infiniteComplete && infiniteComplete();
        });
    }

    /**
     * Search courses or load the next page of current search.
     *
     * @return Promise resolved when done.
     */
    protected async searchCourses(): Promise<void> {
        this.searchLoadMoreError = false;

        try {
            const response = await CoreCourses.search(this.searchText, this.searchPage);

            if (this.searchPage === 0) {
                this.courses = response.courses;
            } else {
                this.courses = this.courses.concat(response.courses);
            }
            this.searchTotal = response.total;

            this.searchPage++;
            this.searchCanLoadMore = this.courses.length < this.searchTotal;
        } catch (error) {
            this.searchLoadMoreError = true; // Set to prevent infinite calls with infinite-loading.
            CoreDomUtils.showErrorModalDefault(error, 'core.courses.errorsearching', true);
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.siteUpdatedObserver?.off();
    }

}
