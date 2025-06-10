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

import { Component, OnInit, OnDestroy, Optional, OnChanges, SimpleChanges } from '@angular/core';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import {
    CoreCoursesProvider,
    CoreCourses,
    CoreCoursesMyCoursesUpdatedEventData,
    CoreCourseSummaryData,
} from '@features/courses/services/courses';
import { CoreCoursesHelper, CoreEnrolledCourseDataWithExtraInfoAndOptions } from '@features/courses/services/courses-helper';
import { CoreCourseHelper, CorePrefetchStatusInfo } from '@features/course/services/course-helper';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { CoreBlockBaseComponent } from '@features/block/classes/base-block-component';
import { CoreSite } from '@classes/sites/site';
import { CoreUtils } from '@services/utils/utils';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreText } from '@singletons/text';
import { AddonCourseCompletion } from '@addons/coursecompletion/services/coursecompletion';
import { IonSearchbar } from '@ionic/angular';
import { CoreNavigator } from '@services/navigator';
import { PageLoadWatcher } from '@classes/page-load-watcher';
import { PageLoadsManager } from '@classes/page-loads-manager';
import { DownloadStatus } from '@/core/constants';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCoursesComponentsModule } from '@features/courses/components/components.module';

const FILTER_PRIORITY: AddonBlockMyOverviewTimeFilters[] =
    ['all', 'inprogress', 'future', 'past', 'favourite', 'allincludinghidden', 'hidden'];

/**
 * Component to render a my overview block.
 */
@Component({
    selector: 'addon-block-myoverview',
    templateUrl: 'addon-block-myoverview.html',
    styleUrl: 'myoverview.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreCoursesComponentsModule,
    ],
})
export class AddonBlockMyOverviewComponent extends CoreBlockBaseComponent implements OnInit, OnDestroy, OnChanges {

    filteredCourses: CoreEnrolledCourseDataWithExtraInfoAndOptions[] = [];

    prefetchCoursesData: CorePrefetchStatusInfo = {
        icon: '',
        statusTranslatable: 'core.loading',
        status: DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED,
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
        timeFilterSelected: 'all', // Aspire School: Show all courses by default
        customFilters: [],
    };
    
    // Category filter for Aspire School
    categoryFilter = 'all';
    availableCategories: string[] = [];

    isLayoutSwitcherAvailable = false;
    layout: AddonBlockMyOverviewLayouts = 'card'; // Aspire School: Use card/block view by default

    sort: AddonBlockMyOverviewSortOptions = {
        shortnameEnabled: false,
        selected: 'fullname',
        enabled: false,
    };

    textFilter = '';
    hasCourses = false;
    searchEnabled = false;

    protected currentSite!: CoreSite;
    protected allCourses: CoreEnrolledCourseDataWithExtraInfoAndOptions[] = [];
    protected prefetchIconsInitialized = false;
    protected isDirty = false;
    protected isDestroyed = false;
    protected coursesObserver?: CoreEventObserver;
    protected updateSiteObserver?: CoreEventObserver;
    protected fetchContentDefaultError = 'Error getting my overview data.';
    protected gradePeriodAfter = 0;
    protected gradePeriodBefore = 0;
    protected today = 0;
    protected firstLoadWatcher?: PageLoadWatcher;
    protected loadsManager: PageLoadsManager;

    constructor(@Optional() loadsManager?: PageLoadsManager) {
        super('AddonBlockMyOverviewComponent');

        this.loadsManager = loadsManager ?? new PageLoadsManager();
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.firstLoadWatcher = this.loadsManager.startComponentLoad(this);

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
    ngOnChanges(changes: SimpleChanges): void {
        super.ngOnChanges(changes);

        if (this.loaded && changes.block) {
            // Block was re-fetched, load content.
            this.reloadContent();
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param done Function to call when done.
     * @returns Promise resolved when done.
     */
    async doRefresh(refresher?: HTMLIonRefresherElement, done?: () => void): Promise<void> {
        if (this.loaded) {
            return this.refreshContent().finally(() => {
                refresher?.complete();
                done && done();
            });
        }
    }

    /**
     * @inheritdoc
     */
    async invalidateContent(): Promise<void> {
        this.isDirty = true;
        const courseIds = this.allCourses.map((course) => course.id);

        await this.invalidateCourses(courseIds);
    }

    /**
     * Invalidate list of courses.
     *
     * @returns Promise resolved when done.
     */
    protected invalidateCourseList(): Promise<void> {
        return CoreCourses.invalidateUserCourses();
    }

    /**
     * Helper function to invalidate only selected courses.
     *
     * @param courseIds Course Id array.
     * @returns Promise resolved when done.
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
    protected async fetchContent(): Promise<void> {
        const loadWatcher = this.firstLoadWatcher ?? this.loadsManager.startComponentLoad(this);
        this.firstLoadWatcher = undefined;

        await Promise.all([
            this.loadAllCourses(loadWatcher),
            this.loadGracePeriod(loadWatcher),
        ]);

        this.loadSort();
        this.loadLayouts(this.block.configsRecord?.layouts?.value.split(','));

        await this.loadFilters(this.block.configsRecord, loadWatcher);

        this.isDirty = false;
    }

    /**
     * Load all courses.
     *
     * @param loadWatcher To manage the requests.
     * @returns Promise resolved when done.
     */
    protected async loadAllCourses(loadWatcher: PageLoadWatcher): Promise<void> {
        const showCategories = this.block.configsRecord?.displaycategories?.value === '1';

        this.allCourses = await loadWatcher.watchRequest(
            CoreCoursesHelper.getUserCoursesWithOptionsObservable({
                sort: this.sort.selected,
                loadCategoryNames: true, // Always load category names for Aspire School
                readingStrategy: this.isDirty ? CoreSitesReadingStrategy.PREFER_NETWORK : loadWatcher.getReadingStrategy(),
            }),
            (prevCourses, newCourses) => this.coursesHaveMeaningfulChanges(prevCourses, newCourses),
        );

        this.hasCourses = this.allCourses.length > 0;
        this.updateAvailableCategories();
    }

    /**
     * Load grace period.
     *
     * @param loadWatcher To manage the requests.
     * @returns Promise resolved when done.
     */
    protected async loadGracePeriod(loadWatcher: PageLoadWatcher): Promise<void> {
        this.hasCourses = this.allCourses.length > 0;

        try {
            const siteConfig = await loadWatcher.watchRequest(
                this.currentSite.getConfigObservable(
                    undefined,
                    this.isDirty ? CoreSitesReadingStrategy.PREFER_NETWORK : loadWatcher.getReadingStrategy(),
                ),
            );

            this.gradePeriodAfter = parseInt(siteConfig.coursegraceperiodafter, 10);
            this.gradePeriodBefore = parseInt(siteConfig.coursegraceperiodbefore, 10);
        } catch {
            this.gradePeriodAfter = 0;
            this.gradePeriodBefore = 0;
        }
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
     * @param loadWatcher To manage the requests.
     * @returns Promise resolved when done.
     */
    protected async loadFilters(
        config?: Record<string, { name: string; value: string; type: string }>,
        loadWatcher?: PageLoadWatcher,
    ): Promise<void> {
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
            ? CoreText.parseJSON(config?.customfieldsexport?.value || '[]', [])
            : [];

        // Check if any selector is shown and not disabled.
        this.filters.enabled = Object.keys(this.filters.show).some((key) => this.filters.show[key]);

        if (!this.filters.enabled) {
            // All filters disabled, display all the courses.
            this.filters.show.all = true;
            this.saveFilters('all');
        }

        await this.filterCourses(loadWatcher);
    }

    /**
     * Load block layouts.
     *
     * @param layouts Config available layouts.
     */
    protected loadLayouts(layouts?: string[]): void {
        // Aspire School: Always use card layout, no switching allowed
        this.layout = 'card';
        this.isLayoutSwitcherAvailable = false;
    }

    /**
     * Refresh course list based on a EVENT_MY_COURSES_UPDATED event.
     *
     * @param data Event data.
     * @returns Promise resolved when done.
     */
    protected async refreshCourseList(data: CoreCoursesMyCoursesUpdatedEventData): Promise<void> {
        if (data.action == CoreCoursesProvider.ACTION_ENROL) {
            // Always update if user enrolled in a course.
            return this.refreshContent(true);
        }

        const course = this.allCourses.find((course) => course.id == data.courseId);
        if (data.action == CoreCoursesProvider.ACTION_STATE_CHANGED) {
            if (!course) {
                // Not found, use WS update.
                return this.refreshContent(true);
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
                return this.refreshContent(true);
            }

            course.lastaccess = CoreTimeUtils.timestamp();

            await this.invalidateCourseList();
            await this.filterCourses();
        }
    }

    /**
     * Initialize the prefetch icon for selected courses.
     *
     * @returns Promise resolved when done.
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
     * @returns Promise resolved when done.
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
     *
     * @param loadWatcher To manage the requests.
     * @returns Promise resolved when done.
     */
    protected async filterCourses(loadWatcher?: PageLoadWatcher): Promise<void> {
        let timeFilter = this.filters.timeFilterSelected;

        this.filteredCourses = this.allCourses;

        if (this.filters.show.custom && timeFilter.startsWith('custom-')) {
            // Custom filter.
            const customFilterName = this.block.configsRecord?.customfiltergrouping.value;
            const customFilterValue = this.filters.customFilters[timeFilter.substring(7)]?.value;

            if (customFilterName !== undefined && customFilterValue !== undefined) {
                const alreadyLoading = this.loaded === false;
                this.loaded = false;

                try {
                    const courses = loadWatcher ?
                        await loadWatcher.watchRequest(
                            CoreCourses.getEnrolledCoursesByCustomFieldObservable(customFilterName, customFilterValue, {
                                readingStrategy: loadWatcher.getReadingStrategy(),
                            }),
                            (prevCourses, newCourses) => this.customFilterCoursesHaveMeaningfulChanges(prevCourses, newCourses),
                        )
                        :
                        await CoreCourses.getEnrolledCoursesByCustomField(customFilterName, customFilterValue);

                    // Get the courses information from allincludinghidden to get the max info about the course.
                    const courseIds = courses.map((course) => course.id);

                    this.filteredCourses = this.filteredCourses.filter((course) => courseIds.includes(course.id));
                    this.saveFilters(timeFilter);
                } catch (error) {
                    if (alreadyLoading) {
                        throw error; // Pass the error to the caller so it's treated there.
                    }

                    CoreDomUtils.showErrorModalDefault(error, this.fetchContentDefaultError);
                } finally {
                    if (!alreadyLoading) {
                        // Only set loaded to true if there was no other data being loaded.
                        this.loaded = true;
                    }
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
        
        // Category filter for Aspire School
        if (this.categoryFilter && this.categoryFilter !== 'all') {
            this.filteredCourses = this.filteredCourses.filter((course) =>
                course.categoryname === this.categoryFilter);
        }

        this.sortCourses(this.sort.selected);

        // Refresh prefetch data (if enabled).
        this.prefetchIconsInitialized = false;
        this.initPrefetchCoursesIcons();
    }
    
    /**
     * Extract available categories from all courses.
     */
    protected updateAvailableCategories(): void {
        const categoriesSet = new Set<string>();
        this.allCourses.forEach(course => {
            if (course.categoryname) {
                categoriesSet.add(course.categoryname);
            }
        });
        this.availableCategories = Array.from(categoriesSet).sort();
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
     * @returns Promise resolved when done.
     */
    async saveFilters(timeFilter: string): Promise<void> {
        this.filters.timeFilterSelected = timeFilter;
        await this.currentSite.setLocalSiteConfig('AddonBlockMyOverviewFilter', timeFilter);
    }

    /**
     * Toggle layout value.
     *
     * @param layout New layout.
     * @returns Promise resolved when done.
     */
    async toggleLayout(layout: AddonBlockMyOverviewLayouts): Promise<void> {
        this.layout = layout;

        await this.currentSite.setLocalSiteConfig('AddonBlockMyOverviewLayout', this.layout);
    }

    /**
     * Saves sort courses value.
     *
     * @param sort New sorting.
     * @returns Promise resolved when done.
     */
    async saveSort(sort: string): Promise<void> {
        this.sort.selected = sort;

        await this.currentSite.setLocalSiteConfig('AddonBlockMyOverviewSort', this.sort.selected);
    }

    /**
     * Option selected save and apply filter.
     *
     * @param selected Option selected.
     * @returns Promise resolved when done.
     */
    async filterOptionsChanged(selected: AddonBlockMyOverviewTimeFilters): Promise<void> {
        this.filters.timeFilterSelected = selected;
        this.filterCourses();
    }

    /**
     * Sort option selected save and apply sort.
     *
     * @param selected Sort option selected.
     * @returns Promise resolved when done.
     */
    async sortOptionsChanged(selected: string): Promise<void> {
        this.sort.selected = selected;
        await this.saveSort(selected);
        this.sortCourses(selected);
    }
    
    /**
     * Category filter selected - apply filter.
     *
     * @param selected Category selected.
     * @returns Promise resolved when done.
     */
    async categoryFilterChanged(selected: string): Promise<void> {
        this.categoryFilter = selected;
        await this.filterCourses();
    }

    /**
     * Go to search courses.
     */
    async openSearch(): Promise<void> {
        CoreNavigator.navigateToSitePath('courses/list', { params : { mode: 'search' } });
    }

    /**
     * Compare if the WS data has meaningful changes for the user.
     *
     * @param previousCourses Previous courses.
     * @param newCourses New courses.
     * @returns Whether it has meaningful changes.
     */
    protected async coursesHaveMeaningfulChanges(
        previousCourses: CoreEnrolledCourseDataWithExtraInfoAndOptions[],
        newCourses: CoreEnrolledCourseDataWithExtraInfoAndOptions[],
    ): Promise<boolean> {
        if (previousCourses.length !== newCourses.length) {
            return true;
        }

        previousCourses = Array.from(previousCourses)
            .sort((a, b) => a.fullname.toLowerCase().localeCompare(b.fullname.toLowerCase()));
        newCourses = Array.from(newCourses).sort((a, b) => a.fullname.toLowerCase().localeCompare(b.fullname.toLowerCase()));

        for (let i = 0; i < previousCourses.length; i++) {
            const prevCourse = previousCourses[i];
            const newCourse = newCourses[i];

            if (
                prevCourse.progress !== newCourse.progress ||
                prevCourse.categoryname !== newCourse.categoryname ||
                (prevCourse.displayname ?? prevCourse.fullname) !== (newCourse.displayname ?? newCourse.fullname)
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Compare if the WS data has meaningful changes for the user.
     *
     * @param previousCourses Previous courses.
     * @param newCourses New courses.
     * @returns Whether it has meaningful changes.
     */
    protected async customFilterCoursesHaveMeaningfulChanges(
        previousCourses: CoreCourseSummaryData[],
        newCourses: CoreCourseSummaryData[],
    ): Promise<boolean> {
        if (previousCourses.length !== newCourses.length) {
            return true;
        }

        const previousIds = previousCourses.map(course => course.id).sort();
        const newIds = newCourses.map(course => course.id).sort();

        return previousIds.some((previousId, index) => previousId !== newIds[index]);
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
