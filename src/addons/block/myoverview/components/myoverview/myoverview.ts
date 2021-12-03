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

import { Component, OnInit, Input, OnDestroy, OnChanges, SimpleChange } from '@angular/core';
import { ModalOptions } from '@ionic/core';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreCoursesProvider, CoreCourses, CoreCoursesMyCoursesUpdatedEventData } from '@features/courses/services/courses';
import { CoreCoursesHelper, CoreEnrolledCourseDataWithOptions } from '@features/courses/services/courses-helper';
import { CoreCourseHelper, CorePrefetchStatusInfo } from '@features/course/services/course-helper';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { CoreBlockBaseComponent } from '@features/block/classes/base-block-component';
import { CoreSite } from '@classes/site';
import { CoreUtils } from '@services/utils/utils';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { AddonCourseCompletion } from '@/addons/coursecompletion/services/coursecompletion';
import { AddonBlockMyOverviewFilterOptionsComponent } from '../filteroptions/filteroptions';
import { IonSearchbar } from '@ionic/angular';
import moment from 'moment';

const FILTER_PRIORITY: AddonBlockMyOverviewTimeFilters[] = ['all', 'inprogress', 'future', 'past'];

/**
 * Component to render a my overview block.
 */
@Component({
    selector: 'addon-block-myoverview',
    templateUrl: 'addon-block-myoverview.html',
})
export class AddonBlockMyOverviewComponent extends CoreBlockBaseComponent implements OnInit, OnChanges, OnDestroy {

    @Input() downloadEnabled = false;

    filteredCourses: CoreEnrolledCourseDataWithOptions[] = [];

    prefetchCoursesData: CorePrefetchStatusInfo = {
        icon: '',
        statusTranslatable: 'core.loading',
        status: '',
        loading: true,
    };

    downloadCourseEnabled = false;
    downloadCoursesEnabled = false;

    filters: AddonBlockMyOverviewFilterOptions = {
        enabled: false,
        show: { // Options are visible, disabled, hidden.
            all: true,
            past: true,
            inprogress: true,
            future: true,
            favourite: true,
            hidden: true,
            custom: false,
        },
        timeFilterSelected: 'inprogress',
        favouriteSelected: false,
        hiddenSelected: false,
        customFilters: [],
        count: 0,
    };

    filterModalOptions: ModalOptions = {
        component: AddonBlockMyOverviewFilterOptionsComponent,
    };

    layouts: AddonBlockMyOverviewLayoutOptions = {
        options: [],
        selected: 'card',
    };

    sort: AddonBlockMyOverviewSortOptions = {
        shortnameEnabled: false,
        selected: 'fullname',
        enabled: false,
    };

    textFilter = '';
    hasCourses = false;

    protected currentSite!: CoreSite;
    protected allCourses: CoreEnrolledCourseDataWithOptions[] = [];
    protected prefetchIconsInitialized = false;
    protected isDestroyed = false;
    protected coursesObserver?: CoreEventObserver;
    protected updateSiteObserver?: CoreEventObserver;
    protected fetchContentDefaultError = 'Error getting my overview data.';
    protected gradePeriodAfter = 0;
    protected gradePeriodBefore = 0;

    constructor() {
        super('AddonBlockMyOverviewComponent');
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        // Refresh the enabled flags if enabled.
        this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();
        this.downloadCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();

        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();
            this.downloadCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();

        }, CoreSites.getCurrentSiteId());

        this.coursesObserver = CoreEvents.on(
            CoreCoursesProvider.EVENT_MY_COURSES_UPDATED,
            (data) => {
                this.refreshCourseList(data);
            },
            CoreSites.getCurrentSiteId(),
        );

        this.currentSite = CoreSites.getRequiredCurrentSite();

        const promises: Promise<void>[] = [];

        promises.push(this.currentSite.getLocalSiteConfig(
            'AddonBlockMyOverviewSort',
            this.sort.selected,
        ).then((value) => {
            this.sort.selected = value;

            return;
        }));

        promises.push(this.currentSite.getLocalSiteConfig(
            'AddonBlockMyOverviewLayout',
            this.layouts.selected,
        ).then((value) => {
            this.layouts.selected = value;

            return;
        }));

        // Wait for the migration.
        await this.currentSite.getLocalSiteConfig<string>(
            'AddonBlockMyOverviewFilter',
            this.filters.timeFilterSelected,
        ).then(async (value) => {
            if (FILTER_PRIORITY.includes(value as AddonBlockMyOverviewTimeFilters)) {
                this.filters.timeFilterSelected = value as AddonBlockMyOverviewTimeFilters;

                return;
            }

            // Migrate setting.
            this.filters.hiddenSelected = value == 'allincludinghidden' || value == 'hidden';

            if (value == 'favourite') {
                this.filters.favouriteSelected = true;
            } else {
                this.filters.favouriteSelected = false;
            }

            return await this.saveFilters('all');
        });

        promises.push(this.currentSite.getLocalSiteConfig(
            'AddonBlockMyOverviewFavouriteFilter',
            this.filters.favouriteSelected ? 1 : 0,
        ).then((value) => {
            this.filters.favouriteSelected = value == 1;

            return;
        }));

        promises.push(this.currentSite.getLocalSiteConfig(
            'AddonBlockMyOverviewHiddenFilter',
            this.filters.hiddenSelected ? 1 : 0,
        ).then((value) => {
            this.filters.hiddenSelected = value == 1;

            return;
        }));

        Promise.all(promises).finally(() => {
            super.ngOnInit();
        });
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {
        if (changes.downloadEnabled && !changes.downloadEnabled.previousValue && this.downloadEnabled && this.loaded) {
            // Download all courses is enabled now, initialize it.
            this.initPrefetchCoursesIcons();
        }
    }

    /**
     * @inheritdoc
     */
    protected async invalidateContent(): Promise<void> {
        const courseIds = this.allCourses.map((course) => course.id);

        await this.invalidateCourses(courseIds);
    }

    /**
     * Helper function to invalidate only selected courses.
     *
     * @param courseIds Course Id array.
     * @return Promise resolved when done.
     */
    protected async invalidateCourses(courseIds: number[]): Promise<void> {
        const promises: Promise<void>[] = [];

        // Invalidate course completion data.
        promises.push(CoreCourses.invalidateUserCourses().finally(() =>
            CoreUtils.allPromises(courseIds.map((courseId) =>
                AddonCourseCompletion.invalidateCourseCompletion(courseId)))));

        if (courseIds.length  == 1) {
            promises.push(CoreCourseOptionsDelegate.clearAndInvalidateCoursesOptions(courseIds[0]));
        } else {
            promises.push(CoreCourseOptionsDelegate.clearAndInvalidateCoursesOptions());
        }
        if (courseIds.length > 0) {
            promises.push(CoreCourses.invalidateCoursesByField('ids', courseIds.join(',')));
        }

        await CoreUtils.allPromises(promises).finally(() => {
            this.prefetchIconsInitialized = false;
        });
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(refresh?: boolean): Promise<void> {
        const config = this.block.configsRecord;

        const showCategories = config?.displaycategories?.value == '1';

        this.allCourses = await CoreCoursesHelper.getUserCoursesWithOptions(
            this.sort.selected,
            undefined,
            undefined,
            showCategories,
            {
                readingStrategy: refresh ? CoreSitesReadingStrategy.PREFER_NETWORK : undefined,
            },
        );

        this.hasCourses = this.allCourses.length > 0;

        this.gradePeriodAfter = parseInt(await this.currentSite.getConfig('coursegraceperiodafter', refresh), 10) || 0;
        this.gradePeriodBefore = parseInt(await this.currentSite.getConfig('coursegraceperiodbefore', refresh), 10) || 0;

        this.loadSort();
        this.loadLayouts(config?.layouts?.value.split(','));
        this.loadFilters(config);
    }

    /**
     * Load sort.
     */
    protected loadSort(): void {
        const sampleCourse = this.allCourses[0];

        // Check to show sort by short name only if the text is visible.
        this.sort.shortnameEnabled = !!sampleCourse?.displayname && !!sampleCourse?.shortname &&
            sampleCourse?.fullname != sampleCourse?.displayname;

        // Rollback to sort by full name if user is sorting by short name then Moodle web change the config.
        if (!this.sort.shortnameEnabled && this.sort.selected === 'shortname') {
            this.saveSort('fullname');
        }

        this.sort.enabled = sampleCourse?.lastaccess !== undefined;
    }

    /**
     * Load filters.
     *
     * @param config Block configuration.
     */
    protected loadFilters(
        config?: Record<string, { name: string; value: string; type: string }>,
    ): void {
        this.textFilter = '';

        const sampleCourse = this.allCourses[0];

        // Do not show hidden if config it's not present (before 3.8) but if hidden is enabled.
        this.filters.show.hidden =
            config?.displaygroupingallincludinghidden?.value == '1' ||
            sampleCourse.hidden !== undefined && (!config || config.displaygroupinghidden?.value == '1');

        this.filters.show.all =  !config || config.displaygroupingall?.value == '1';
        this.filters.show.inprogress = !config || config.displaygroupinginprogress?.value == '1';
        this.filters.show.past = !config || config.displaygroupingpast?.value == '1';
        this.filters.show.future = !config || config.displaygroupingfuture?.value == '1';

        this.filters.show.favourite = sampleCourse.isfavourite !== undefined &&
            (!config || config.displaygroupingstarred?.value == '1' || config.displaygroupingfavourites?.value == '1');

        this.filters.show.custom = config?.displaygroupingcustomfield?.value == '1' && !!config?.customfieldsexport?.value;

        this.filters.customFilters = this.filters.show.custom
            ? CoreTextUtils.parseJSON(config?.customfieldsexport?.value || '[]', [])
            : [];

        // Check if any selector is shown and not disabled.
        this.filters.enabled = Object.keys(this.filters.show).some((key) => this.filters.show[key]);

        if (!this.filters.enabled) {
            // All filters disabled, display all the courses.
            this.filters.show.all = true;
            this.saveFilters('all');
        }

        this.filterModalOptions.componentProps = {
            options: Object.assign({}, this.filters),
        };

        this.filterCourses();
    }

    /**
     * Load block layouts.
     *
     * @param layouts Config available layouts.
     */
    protected loadLayouts(layouts?: string[]): void {
        this.layouts.options = [];

        if (layouts === undefined) {
            this.layouts.options = ['card', 'list'];

            return;
        }

        layouts.forEach((layout) => {
            if (layout == '') {
                return;
            }

            const validLayout: AddonBlockMyOverviewLayouts = layout == 'summary' ? 'list' : layout as AddonBlockMyOverviewLayouts;
            if (!this.layouts.options.includes(validLayout)) {
                this.layouts.options.push(validLayout);
            }
        });

        // If no layout is available use card.
        if (this.layouts.options.length == 0) {
            this.layouts.options = ['card'];
        }

        if (!this.layouts.options.includes(this.layouts.selected)) {
            this.layouts.selected = this.layouts.options[0];
        }
    }

    /**
     * Refresh course list based on a EVENT_MY_COURSES_UPDATED event.
     *
     * @param data Event data.
     * @return Promise resolved when done.
     */
    protected async refreshCourseList(data: CoreCoursesMyCoursesUpdatedEventData): Promise<void> {
        if (data.action == CoreCoursesProvider.ACTION_ENROL) {
            // Always update if user enrolled in a course.
            return await this.refreshContent();
        }

        const course = this.allCourses.find((course) => course.id == data.courseId);
        if (data.action == CoreCoursesProvider.ACTION_STATE_CHANGED) {
            if (!course) {
                // Not found, use WS update.
                return await this.refreshContent();
            }

            if (data.state == CoreCoursesProvider.STATE_FAVOURITE) {
                course.isfavourite = !!data.value;
            }

            if (data.state == CoreCoursesProvider.STATE_HIDDEN) {
                course.hidden = !!data.value;
            }

            await this.invalidateCourses([course.id]);
            await this.filterCourses();
        }

        if (data.action == CoreCoursesProvider.ACTION_VIEW && data.courseId != CoreSites.getCurrentSiteHomeId()) {
            if (!course) {
                // Not found, use WS update.
                return await this.refreshContent();
            }

            course.lastaccess = CoreTimeUtils.timestamp();

            await this.invalidateCourses([course.id]);
            await this.filterCourses();
        }
    }

    /**
     * Initialize the prefetch icon for selected courses.
     *
     * @return Promise resolved when done.
     */
    async initPrefetchCoursesIcons(): Promise<void> {
        if (this.prefetchIconsInitialized || !this.downloadEnabled) {
            // Already initialized.
            return;
        }

        this.prefetchIconsInitialized = true;

        this.prefetchCoursesData = await CoreCourseHelper.initPrefetchCoursesIcons(this.filteredCourses, this.prefetchCoursesData);
    }

    /**
     * Prefetch all the shown courses.
     *
     * @return Promise resolved when done.
     */
    async prefetchCourses(): Promise<void> {
        const initialIcon = this.prefetchCoursesData.icon;

        try {
            await CoreCourseHelper.prefetchCourses(this.filteredCourses, this.prefetchCoursesData);
        } catch (error) {
            if (!this.isDestroyed) {
                CoreDomUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
                this.prefetchCoursesData.icon = initialIcon;
            }
        }
    }

    /**
     * Text filter changed.
     *
     * @param target Searchbar element.
     */
    filterTextChanged(target: IonSearchbar): void {
        this.textFilter = target.value || '';

        this.filterCourses();
    }

    /**
     * Set selected courses filter.
     */
    protected async filterCourses(): Promise<void> {
        this.filters.count = 0;

        let timeFilter = this.filters.timeFilterSelected;

        // Filter is not active, take the first active or all.
        if (!this.filters.show[timeFilter]) {
            timeFilter = FILTER_PRIORITY.find((name) => this.filters.show[name]) || 'all';

            this.saveFilters(timeFilter);
        }

        if (timeFilter !== 'all') {
            this.filters.count++;
        }

        this.filteredCourses = this.allCourses;

        const customFilterName = this.block.configsRecord?.customfiltergrouping.value;
        const customFilterValue = this.filters.customSelected;
        if (customFilterName && this.filters.show.custom && customFilterValue !== undefined) {
            this.filters.count++;

            this.loaded = false;
            try {
                const courses = await CoreCourses.getEnrolledCoursesByCustomField(customFilterName, customFilterValue);

                const courseIds = courses.map((course) => course.id);

                this.filteredCourses = this.filteredCourses.filter((course) => courseIds.includes(course.id));
            } catch (error) {
                CoreDomUtils.showErrorModalDefault(error, this.fetchContentDefaultError);
            } finally {
                this.loaded = true;
            }
        }

        const onlyFavourite = this.filters.show.favourite && this.filters.favouriteSelected;
        if (onlyFavourite) {
            this.filters.count++;
        }

        const showHidden = this.filters.show.hidden && this.filters.hiddenSelected;
        if (showHidden) {
            this.filters.count++;
        }

        // Time filter, favourite and hidden.
        const today = CoreTimeUtils.timestamp();

        this.filteredCourses = this.filteredCourses.filter((course) => {
            let include = timeFilter == 'all';

            if (!include) {
                if ((course.enddate && this.courseClassifyEndDate(course.enddate) < today) || course.completed) {
                    // Courses that have already ended.
                    include = timeFilter == 'past';
                } else if (course.startdate && this.courseClassifyStartDate(course.startdate) > today) {
                    // Courses that have not started yet.
                    include = timeFilter == 'future';
                } else {
                    // Courses still in progress.
                    include = timeFilter == 'inprogress';
                }
            }

            if (onlyFavourite) {
                include = include && !!course.isfavourite;
            }

            if (!showHidden) {
                include = include && !course.hidden;
            }

            return include;
        });

        // Text filter.
        const value = this.textFilter.trim().toLowerCase();
        if (value != '' && this.filteredCourses.length > 0) {
            // Use displayname if available, or fullname if not.
            if (this.filteredCourses[0].displayname !== undefined) {
                this.filteredCourses = this.filteredCourses.filter((course) =>
                    course.displayname && course.displayname.toLowerCase().indexOf(value) > -1);
            } else {
                this.filteredCourses = this.filteredCourses.filter((course) =>
                    course.fullname.toLowerCase().indexOf(value) > -1);
            }
        }

        this.sortCourses(this.sort.selected);

        // Refresh prefetch data (if enabled).
        this.prefetchIconsInitialized = false;
        this.initPrefetchCoursesIcons();
    }

    /**
     * This function calculates the end date to use for display classification purposes, incorporating the grace period, if any.
     *
     * @param endDate Course end date.
     * @return The new enddate.
     */
    protected courseClassifyEndDate(endDate: number): number {
        return moment(endDate).add(this.gradePeriodAfter, 'days').valueOf();
    }

    /**
     * This function calculates the start date to use for display classification purposes, incorporating the grace period, if any.
     *
     * @param startDate Course start date.
     * @return The new startdate.
     */
    protected courseClassifyStartDate(startDate: number): number {
        return moment(startDate).subtract(this.gradePeriodBefore, 'days').valueOf();
    }

    /**
     * Sort courses
     *
     * @param sort Sort by value.
     */
    sortCourses(sort: string): void {
        if (!this.sort.enabled) {
            return;
        }

        if (this.sort.selected != sort) {
            this.saveSort(sort);
        }

        if (this.sort.selected == 'lastaccess') {
            this.filteredCourses.sort((a, b) => (b.lastaccess || 0) - (a.lastaccess || 0));
        } else if (this.sort.selected == 'fullname') {
            this.filteredCourses.sort((a, b) => {
                const compareA = a.fullname.toLowerCase();
                const compareB = b.fullname.toLowerCase();

                return compareA.localeCompare(compareB);
            });
        } else if (this.sort.selected == 'shortname') {
            this.filteredCourses.sort((a, b) => {
                const compareA = a.shortname.toLowerCase();
                const compareB = b.shortname.toLowerCase();

                return compareA.localeCompare(compareB);
            });
        }
    }

    /**
     * Saves filters value.
     *
     * @param timeFilter New time filter.
     * @return Promise resolved when done.
     */
    async saveFilters(timeFilter: AddonBlockMyOverviewTimeFilters): Promise<void> {
        this.filters.timeFilterSelected = timeFilter;

        this.filterModalOptions.componentProps = {
            options: Object.assign({}, this.filters),
        };

        await Promise.all([
            this.currentSite.setLocalSiteConfig('AddonBlockMyOverviewFilter', this.filters.timeFilterSelected),
            this.currentSite.setLocalSiteConfig('AddonBlockMyOverviewFavouriteFilter', this.filters.favouriteSelected ? 1 : 0),
            this.currentSite.setLocalSiteConfig('AddonBlockMyOverviewHiddenFilter', this.filters.hiddenSelected ? 1 : 0),
        ]);
    }

    /**
     * Saves layout value.
     *
     * @param layout New layout.
     * @return Promise resolved when done.
     */
    async saveLayout(layout: AddonBlockMyOverviewLayouts): Promise<void> {
        this.layouts.selected = layout;

        await this.currentSite.setLocalSiteConfig('AddonBlockMyOverviewLayout', this.layouts.selected);
    }

    /**
     * Saves sort courses value.
     *
     * @param sort New sorting.
     * @return Promise resolved when done.
     */
    async saveSort(sort: string): Promise<void> {
        this.sort.selected = sort;

        await this.currentSite.setLocalSiteConfig('AddonBlockMyOverviewSort', this.sort.selected);
    }

    /**
     * Opens display Options modal.
     *
     * @return Promise resolved when done.
     */
    filterOptionsChanged(modalData: AddonBlockMyOverviewFilterOptions): void {
        this.filters = modalData;
        this.saveFilters(this.filters.timeFilterSelected);
        this.filterCourses();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.coursesObserver?.off();
        this.updateSiteObserver?.off();
    }

}

type AddonBlockMyOverviewLayouts = 'card'|'list';
type AddonBlockMyOverviewTimeFilters = 'all'|'inprogress'|'future'|'past';

export type AddonBlockMyOverviewFilterOptions = {
    enabled: boolean;
    show: {
        all: boolean;
        inprogress: boolean;
        future: boolean;
        past: boolean;
        favourite: boolean;
        hidden: boolean;
        custom: boolean;
    };
    timeFilterSelected: AddonBlockMyOverviewTimeFilters;
    favouriteSelected: boolean;
    hiddenSelected: boolean;
    customFilters: {
        name: string;
        value: string;
    }[];
    customSelected?: string;
    count: number;
};

type AddonBlockMyOverviewLayoutOptions = {
    options: AddonBlockMyOverviewLayouts[];
    selected: AddonBlockMyOverviewLayouts;
};

type AddonBlockMyOverviewSortOptions = {
    shortnameEnabled: boolean;
    selected: string;
    enabled: boolean;
};
