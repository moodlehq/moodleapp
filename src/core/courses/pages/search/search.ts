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
import { IonicPage } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreCoursesProvider } from '../../providers/courses';

/**
 * Page that allows searching for courses.
 */
@IonicPage({ segment: 'core-courses-search' })
@Component({
    selector: 'page-core-courses-search',
    templateUrl: 'search.html',
})
export class CoreCoursesSearchPage {
    total = 0;
    courses: any[];
    canLoadMore: boolean;
    loadMoreError = false;

    protected page = 0;
    protected currentSearch = '';

    constructor(private domUtils: CoreDomUtilsProvider, private coursesProvider: CoreCoursesProvider) { }

    /**
     * Search a new text.
     *
     * @param {string} text The text to search.
     */
    search(text: string): void {
        this.currentSearch = text;
        this.courses = undefined;
        this.page = 0;

        const modal = this.domUtils.showModalLoading('core.searching', true);
        this.searchCourses().finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Load more results.
     *
     * @param {any} [infiniteComplete] Infinite scroll complete function. Only used from core-infinite-loading.
     */
    loadMoreResults(infiniteComplete?: any): void {
        this.searchCourses().finally(() => {
            infiniteComplete && infiniteComplete();
        });
    }

    /**
     * Search courses or load the next page of current search.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected searchCourses(): Promise<any> {
        this.loadMoreError = false;

        return this.coursesProvider.search(this.currentSearch, this.page).then((response) => {
            if (this.page === 0) {
                this.courses = response.courses;
            } else {
                this.courses = this.courses.concat(response.courses);
            }
            this.total = response.total;

            this.page++;
            this.canLoadMore = this.courses.length < this.total;
        }).catch((error) => {
            this.loadMoreError = true; // Set to prevent infinite calls with infinite-loading.
            this.domUtils.showErrorModalDefault(error, 'core.courses.errorsearching', true);
        });
    }
}
