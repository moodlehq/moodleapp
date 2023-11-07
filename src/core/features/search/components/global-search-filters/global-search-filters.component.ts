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

import { Component, OnInit, Input } from '@angular/core';
import { CoreEnrolledCourseData, CoreCourses } from '@features/courses/services/courses';
import {
    CoreSearchGlobalSearchFilters,
    CoreSearchGlobalSearch,
    CoreSearchGlobalSearchSearchAreaCategory,
    CORE_SEARCH_GLOBAL_SEARCH_FILTERS_UPDATED,
} from '@features/search/services/global-search';
import { CoreEvents } from '@singletons/events';
import { ModalController } from '@singletons';
import { CoreUtils } from '@services/utils/utils';

type Filter<T=unknown> = T & { checked: boolean };

@Component({
    selector: 'core-search-global-search-filters',
    templateUrl: 'global-search-filters.html',
    styleUrls: ['./global-search-filters.scss'],
})
export class CoreSearchGlobalSearchFiltersComponent implements OnInit {

    allSearchAreaCategories: boolean | null = true;
    searchAreaCategories: Filter<CoreSearchGlobalSearchSearchAreaCategory>[] = [];
    allCourses: boolean | null = true;
    courses: Filter<CoreEnrolledCourseData>[] = [];

    @Input() hideCourses?: boolean;
    @Input() filters?: CoreSearchGlobalSearchFilters;

    private newFilters: CoreSearchGlobalSearchFilters = {};

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.newFilters = this.filters ?? {};

        await this.updateSearchAreaCategories();
        await this.updateCourses();
    }

    /**
     * Close popover.
     */
    close(): void {
        ModalController.dismiss();
    }

    /**
     * Checkbox for all search area categories has been updated.
     */
    allSearchAreaCategoriesUpdated(): void {
        if (this.allSearchAreaCategories === null) {
            return;
        }

        const checked = this.allSearchAreaCategories;

        this.searchAreaCategories.forEach(searchAreaCategory => {
            if (searchAreaCategory.checked === checked) {
                return;
            }

            searchAreaCategory.checked = checked;
        });
    }

    /**
     * Checkbox for one search area category has been updated.
     *
     * @param searchAreaCategory Filter status.
     */
    onSearchAreaCategoryInputChanged(searchAreaCategory: Filter<CoreSearchGlobalSearchSearchAreaCategory>): void {
        if (
            !searchAreaCategory.checked &&
            this.newFilters.searchAreaCategoryIds &&
            !this.newFilters.searchAreaCategoryIds.includes(searchAreaCategory.id)
        ) {
            return;
        }

        if (
            searchAreaCategory.checked &&
            (!this.newFilters.searchAreaCategoryIds || this.newFilters.searchAreaCategoryIds.includes(searchAreaCategory.id))
        ) {
            return;
        }

        this.searchAreaCategoryUpdated();
    }

    /**
     * Checkbox for all courses has been updated.
     */
    allCoursesUpdated(): void {
        if (this.allCourses === null) {
            return;
        }

        const checked = this.allCourses;

        this.courses.forEach(course => {
            if (course.checked === checked) {
                return;
            }

            course.checked = checked;
        });
    }

    /**
     * Checkbox for one course has been updated.
     *
     * @param course Filter status.
     */
    onCourseInputChanged(course: Filter<CoreEnrolledCourseData>): void {
        if (!course.checked && this.newFilters.courseIds && !this.newFilters.courseIds.includes(course.id)) {
            return;
        }

        if (course.checked && (!this.newFilters.courseIds || this.newFilters.courseIds.includes(course.id))) {
            return;
        }

        this.courseUpdated();
    }

    /**
     * Refresh filters.
     *
     * @param refresher Refresher.
     */
    async refreshFilters(refresher?: HTMLIonRefresherElement): Promise<void> {
        await CoreUtils.ignoreErrors(Promise.all([
            CoreSearchGlobalSearch.invalidateSearchAreas(),
            CoreCourses.invalidateUserCourses(),
        ]));

        await this.updateSearchAreaCategories();
        await this.updateCourses();

        refresher?.complete();
    }

    /**
     * Update search area categories.
     */
    private async updateSearchAreaCategories(): Promise<void> {
        const searchAreas = await CoreSearchGlobalSearch.getSearchAreas();
        const searchAreaCategoryIds = new Set();

        this.searchAreaCategories = [];

        for (const searchArea of searchAreas) {
            if (searchAreaCategoryIds.has(searchArea.category.id)) {
                continue;
            }

            searchAreaCategoryIds.add(searchArea.category.id);
            this.searchAreaCategories.push({
                ...searchArea.category,
                checked: this.filters?.searchAreaCategoryIds?.includes(searchArea.category.id) ?? true,
            });
        }

        this.allSearchAreaCategories = this.getGroupFilterStatus(this.searchAreaCategories);
    }

    /**
     * Update courses.
     */
    private async updateCourses(): Promise<void> {
        const courses = await CoreCourses.getUserCourses();

        this.courses = courses
            .sort((a, b) => (a.shortname?.toLowerCase() ?? '').localeCompare(b.shortname?.toLowerCase() ?? ''))
            .map(course => ({
                ...course,
                checked: this.filters?.courseIds?.includes(course.id) ?? true,
            }));

        this.allCourses = this.getGroupFilterStatus(this.courses);
    }

    /**
     * Checkbox for one search area category has been updated.
     */
    private searchAreaCategoryUpdated(): void {
        const filterStatus = this.getGroupFilterStatus(this.searchAreaCategories);

        if (filterStatus !== this.allSearchAreaCategories) {
            this.allSearchAreaCategories = filterStatus;
        }

        this.emitFiltersUpdated();
    }

    /**
     * Course filter status has been updated.
     */
    private courseUpdated(): void {
        const filterStatus = this.getGroupFilterStatus(this.courses);

        if (filterStatus !== this.allCourses) {
            this.allCourses = filterStatus;
        }

        this.emitFiltersUpdated();
    }

    /**
     * Get the status for a filter representing a group of filters.
     *
     * @param filters Filters in the group.
     * @returns Group filter status. This will be true if all filters are checked, false if all filters are unchecked,
     *          or null if filters have mixed states.
     */
    private getGroupFilterStatus(filters: Filter[]): boolean | null {
        if (filters.length === 0) {
            return null;
        }

        const firstChecked = filters[0].checked;

        for (const filter of filters) {
            if (filter.checked === firstChecked) {
                continue;
            }

            return null;
        }

        return firstChecked;
    }

    /**
     * Emit filters updated event.
     */
    private emitFiltersUpdated(): void {
        this.newFilters = {};

        if (!this.allSearchAreaCategories) {
            this.newFilters.searchAreaCategoryIds = this.searchAreaCategories.filter(({ checked }) => checked).map(({ id }) => id);
        }

        if (!this.allCourses) {
            this.newFilters.courseIds = this.courses.filter(({ checked }) => checked).map(({ id }) => id);
        }

        CoreEvents.trigger(CORE_SEARCH_GLOBAL_SEARCH_FILTERS_UPDATED, this.newFilters);
    }

}
