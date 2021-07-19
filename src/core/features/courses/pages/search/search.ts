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

import { Component } from '@angular/core';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreCourseBasicSearchedData, CoreCourses } from '../../services/courses';

/**
 * Page that allows searching for courses.
 */
@Component({
    selector: 'page-core-courses-search',
    templateUrl: 'search.html',
})
export class CoreCoursesSearchPage {

    total = 0;
    courses: CoreCourseBasicSearchedData[] = [];
    canLoadMore = false;
    loadMoreError = false;

    protected page = 0;
    protected currentSearch = '';

    /**
     * Search a new text.
     *
     * @param text The text to search.
     */
    async search(text: string): Promise<void> {
        this.currentSearch = text;
        this.courses = [];
        this.page = 0;
        this.total = 0;

        const modal = await CoreDomUtils.showModalLoading('core.searching', true);
        this.searchCourses().finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Clear search box.
     */
    clearSearch(): void {
        this.currentSearch = '';
        this.courses = [];
        this.page = 0;
        this.total = 0;
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
        this.loadMoreError = false;

        try {
            const response = await CoreCourses.search(this.currentSearch, this.page);

            if (this.page === 0) {
                this.courses = response.courses;
            } else {
                this.courses = this.courses.concat(response.courses);
            }
            this.total = response.total;

            this.page++;
            this.canLoadMore = this.courses.length < this.total;
        } catch (error) {
            this.loadMoreError = true; // Set to prevent infinite calls with infinite-loading.
            CoreDomUtils.showErrorModalDefault(error, 'core.courses.errorsearching', true);
        }
    }

}
