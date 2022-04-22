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

import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { AddonCourseCompletion } from '@addons/coursecompletion/services/coursecompletion';
import { IonSearchbar } from '@ionic/angular';
import { CoreNavigator } from '@services/navigator';

const FILTER_PRIORITY: AddonBlockMyOverviewTimeFilters[] =
    ['all', 'inprogress', 'future', 'past', 'favourite', 'allincludinghidden', 'hidden'];

/**
 * Component to render a my overview block.
 */
@Component({
    selector: 'addon-block-myoverview',
    templateUrl: 'addon-block-myoverview.html',
    styleUrls: ['myoverview.scss'],
})
export class AddonBlockMyOverviewComponent extends CoreBlockBaseComponent implements OnInit, OnDestroy {

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
            allincludinghidden: true,
            all: true,
            past: true,
            inprogress: true,
            future: true,
            favourite: true,
            hidden: true,
            custom: false,
        },
        timeFilterSelected: 'inprogress',
        customFilters: [],
    };

    isLayoutSwitcherAvailable = false;
    layout: AddonBlockMyOverviewLayouts = 'list';

    sort: AddonBlockMyOverviewSortOptions = {
        shortnameEnabled: false,
        selected: 'fullname',
        enabled: false,
    };

    textFilter = '';
    hasCourses = false;
    searchEnabled = false;

    protected currentSite!: CoreSite;
    protected allCourses: CoreEnrolledCourseDataWithOptions[] = [];
    protected prefetchIconsInitialized = false;
    protected isDestroyed = false;
    protected coursesObserver?: CoreEventObserver;
    protected updateSiteObserver?: CoreEventObserver;
    protected fetchContentDefaultError = 'Error getting my overview data.';
    protected gradePeriodAfter = 0;
    protected gradePeriodBefore = 0;
    protected today = 0;

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
        this.searchEnabled = !CoreCourses.isSearchCoursesDisabledInSite();

        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();
            this.downloadCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();
            this.searchEnabled = !CoreCourses.isSearchCoursesDisabledInSite();
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
            this.layout,
        ).then((value) => {
            this.layout = value;

            return;
        }));

        promises.push(this.currentSite.getLocalSiteConfig(
            'AddonBlockMyOverviewFilter',
            this.filters.timeFilterSelected,
        ).then((value) => {
            this.filters.timeFilterSelected = value;

            return;
        }));

        Promise.all(promises).finally(() => {
            super.ngOnInit();
        });
    }

    /**
     * @inheritdoc
     */
    protected async invalidateContent(): Promise<void> {
        const courseIds = this.allCourses.map((course) => course.id);

        await this.invalidateCourses(courseIds);
    }

    /**
     * Invalidate list of courses.
     *
     * @return Promise resolved when done.
     */
    protected invalidateCourseList(): Promise<void> {
        return CoreCourses.invalidateUserCourses();
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
        promises.push(this.invalidateCourseList().finally(() =>
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

        try {
            this.gradePeriodAfter = parseInt(await this.currentSite.getConfig('coursegraceperiodafter', refresh), 10);
            this.gradePeriodBefore = parseInt(await this.currentSite.getConfig('coursegraceperiodbefore', refresh), 10);
        } catch {
            this.gradePeriodAfter = 0;
            this.gradePeriodBefore = 0;
        }

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
        if (!this.hasCourses) {
            return;
        }

        this.textFilter = '';

        const sampleCourse = this.allCourses[0];

        // Do not show hidden if config it's not present (before 3.8) but if hidden is enabled.
        this.filters.show.hidden =
            config?.displaygroupingallincludinghidden?.value == '1' ||
            sampleCourse.hidden !== undefined && (!config || config.displaygroupinghidden?.value == '1');

        this.filters.show.allincludinghidden =  !config || config.displaygroupingallincludinghidden?.value == '1';
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

        this.filterCourses();
    }

    /**
     * Load block layouts.
     *
     * @param layouts Config available layouts.
     */
    protected loadLayouts(layouts?: string[]): void {
        const layoutsOptions: AddonBlockMyOverviewLayouts[] = [];

        if (layouts === undefined) {
            this.isLayoutSwitcherAvailable = true;

            return;
        }

        layouts.forEach((layout) => {
            if (layout == '') {
                return;
            }

            const validLayout: AddonBlockMyOverviewLayouts = layout == 'summary' ? 'list' : layout as AddonBlockMyOverviewLayouts;
            if (!layoutsOptions.includes(validLayout)) {
                layoutsOptions.push(validLayout);
            }
        });

        // If no layout is available use list.
        if (layoutsOptions.length == 0) {
            layoutsOptions.push('list');
        }

        if (!layoutsOptions.includes(this.layout)) {
            this.layout = layoutsOptions[0];
        }

        this.isLayoutSwitcherAvailable = layoutsOptions.length > 1;
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

            await this.invalidateCourseList();
            await this.filterCourses();
        }

        if (data.action == CoreCoursesProvider.ACTION_VIEW && data.courseId != CoreSites.getCurrentSiteHomeId()) {
            if (!course) {
                // Not found, use WS update.
                return await this.refreshContent();
            }

            course.lastaccess = CoreTimeUtils.timestamp();

            await this.invalidateCourseList();
            await this.filterCourses();
        }
    }

    /**
     * Initialize the prefetch icon for selected courses.
     *
     * @return Promise resolved when done.
     */
    async initPrefetchCoursesIcons(): Promise<void> {
        if (this.prefetchIconsInitialized) {
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
        let timeFilter = this.filters.timeFilterSelected;

        this.filteredCourses = this.allCourses;

        if (this.filters.show.custom && timeFilter.startsWith('custom-')) {
            // Custom filter.
            const customFilterName = this.block.configsRecord?.customfiltergrouping.value;
            const customFilterValue = this.filters.customFilters[timeFilter.substring(7)]?.value;

            if (customFilterName !== undefined && customFilterValue !== undefined) {
                this.loaded = false;
                try {
                    const courses = await CoreCourses.getEnrolledCoursesByCustomField(customFilterName, customFilterValue);

                    // Get the courses information from allincludinghidden to get the max info about the course.
                    const courseIds = courses.map((course) => course.id);

                    this.filteredCourses = this.filteredCourses.filter((course) => courseIds.includes(course.id));
                } catch (error) {
                    CoreDomUtils.showErrorModalDefault(error, this.fetchContentDefaultError);
                } finally {
                    this.loaded = true;
                }
            }
        } else {
            // Filter is not active, take the first active or all. Custom is never saved.
            if (!this.filters.show[timeFilter]) {
                timeFilter = FILTER_PRIORITY.find((name) => this.filters.show[name]) || 'all';
            }
            this.saveFilters(timeFilter);

            // Update today date.
            this.today = Date.now();

            // Apply filters.
            switch(timeFilter) {
                case 'allincludinghidden':
                    // No nothing, it's all courses.
                    break;
                case 'all':
                    this.filteredCourses = this.filteredCourses.filter((course) => !course.hidden);
                    break;
                case 'inprogress':
                    this.filteredCourses = this.filteredCourses.filter((course) =>
                        !course.hidden &&
                        !CoreCoursesHelper.isPastCourse(course, this.gradePeriodAfter) &&
                        !CoreCoursesHelper.isFutureCourse(course, this.gradePeriodAfter, this.gradePeriodBefore));
                    break;
                case 'future':
                    this.filteredCourses = this.filteredCourses.filter((course) =>
                        !course.hidden &&
                        CoreCoursesHelper.isFutureCourse(course, this.gradePeriodAfter, this.gradePeriodBefore));
                    break;
                case 'past':
                    this.filteredCourses = this.filteredCourses.filter((course) =>
                        !course.hidden &&
                        CoreCoursesHelper.isPastCourse(course, this.gradePeriodAfter));
                    break;
                case 'favourite':
                    this.filteredCourses = this.filteredCourses.filter((course) => !course.hidden && course.isfavourite);
                    break;
                case 'hidden':
                    this.filteredCourses = this.filteredCourses.filter((course) => course.hidden);
                    break;
            }
        }

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
    async saveFilters(timeFilter: string): Promise<void> {
        this.filters.timeFilterSelected = timeFilter;
        await this.currentSite.setLocalSiteConfig('AddonBlockMyOverviewFilter', timeFilter);
    }

    /**
     * Toggle layout value.
     *
     * @param layout New layout.
     * @return Promise resolved when done.
     */
    async toggleLayout(layout: AddonBlockMyOverviewLayouts): Promise<void> {
        this.layout = layout;

        await this.currentSite.setLocalSiteConfig('AddonBlockMyOverviewLayout', this.layout);
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
     * Option selected save and apply filter.
     *
     * @param selected Option selected.
     * @return Promise resolved when done.
     */
    async filterOptionsChanged(selected: AddonBlockMyOverviewTimeFilters): Promise<void> {
        this.filters.timeFilterSelected = selected;
        this.filterCourses();
    }

    /**
     * Go to search courses.
     */
    async openSearch(): Promise<void> {
        CoreNavigator.navigateToSitePath('courses/list', { params : { mode: 'search' } });
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
type AddonBlockMyOverviewTimeFilters = 'allincludinghidden'|'all'|'inprogress'|'future'|'past'|'favourite'|'hidden';

export type AddonBlockMyOverviewFilterOptions = {
    enabled: boolean;
    show: {
        allincludinghidden: boolean;
        all: boolean;
        inprogress: boolean;
        future: boolean;
        past: boolean;
        favourite: boolean;
        hidden: boolean;
        custom: boolean;
    };
    timeFilterSelected: string;
    customFilters: {
        name: string;
        value: string;
    }[];
};

type AddonBlockMyOverviewSortOptions = {
    shortnameEnabled: boolean;
    selected: string;
    enabled: boolean;
};
