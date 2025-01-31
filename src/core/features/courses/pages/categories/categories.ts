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
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@singletons/utils';
import { CoreCategoryData, CoreCourseListItem, CoreCourses } from '../../services/courses';
import { Translate } from '@singletons';
import { CoreNavigator } from '@services/navigator';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreTime } from '@singletons/time';
import {
    CORE_COURSES_MY_COURSES_UPDATED_EVENT,
    CoreCoursesMyCoursesUpdatedEventAction,
    CORE_COURSES_DASHBOARD_DOWNLOAD_ENABLED_CHANGED_EVENT,
} from '@features/courses/constants';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreCoursesCourseListItemComponent } from '../../components/course-list-item/course-list-item';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays a list of categories and the courses in the current category if any.
 */
@Component({
    selector: 'page-core-courses-categories',
    templateUrl: 'categories.html',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreCoursesCourseListItemComponent,
    ],
})
export class CoreCoursesCategoriesPage implements OnInit, OnDestroy {

    title: string;
    currentCategory?: CoreCategoryData;
    categories: CoreCategoryData[] = [];
    courses: CoreCourseListItem[] = [];
    categoriesLoaded = false;

    showOnlyEnrolled = false;

    downloadEnabled = false;
    downloadCourseEnabled = false;
    downloadCoursesEnabled = false;

    protected categoryCourses: CoreCourseListItem[] = [];
    protected currentSiteId: string;
    protected categoryId = 0;
    protected myCoursesObserver: CoreEventObserver;
    protected siteUpdatedObserver: CoreEventObserver;
    protected downloadEnabledObserver: CoreEventObserver;
    protected isDestroyed = false;
    protected logView: () => void;

    constructor() {
        this.title = Translate.instant('core.courses.categories');
        this.currentSiteId = CoreSites.getRequiredCurrentSite().getId();

        // Update list if user enrols in a course.
        this.myCoursesObserver = CoreEvents.on(
            CORE_COURSES_MY_COURSES_UPDATED_EVENT,
            (data) => {
                if (data.action === CoreCoursesMyCoursesUpdatedEventAction.ENROL) {
                    this.fetchCategories();
                }
            },

            this.currentSiteId,
        );

        // Refresh the enabled flags if site is updated.
        this.siteUpdatedObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();
            this.downloadCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();

            this.downloadEnabled = (this.downloadCourseEnabled || this.downloadCoursesEnabled) && this.downloadEnabled;
        }, this.currentSiteId);

        this.downloadEnabledObserver = CoreEvents.on(CORE_COURSES_DASHBOARD_DOWNLOAD_ENABLED_CHANGED_EVENT, (data) => {
            this.downloadEnabled = (this.downloadCourseEnabled || this.downloadCoursesEnabled) && data.enabled;
        });

        this.logView = CoreTime.once(() => {
            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'core_course_get_categories',
                name: this.title,
                data: { categoryid: this.categoryId, category: 'course' },
                url: '/course/index.php' + (this.categoryId > 0 ? `?categoryid=${this.categoryId}` : ''),
            });
        });
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.categoryId = CoreNavigator.getRouteNumberParam('id') || 0;
        this.showOnlyEnrolled = CoreNavigator.getRouteBooleanParam('enrolled') || this.showOnlyEnrolled;

        this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();
        this.downloadCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();

        this.downloadEnabled =
            (this.downloadCourseEnabled || this.downloadCoursesEnabled) && CoreCourses.getCourseDownloadOptionsEnabled();

        this.fetchCategories().finally(() => {
            this.categoriesLoaded = true;
        });
    }

    /**
     * Fetch the categories.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchCategories(): Promise<void> {
        try {
            const categories: CoreCategoryData[] = await CoreCourses.getCategories(this.categoryId, true);

            this.currentCategory = undefined;

            const index = categories.findIndex((category) => category.id == this.categoryId);

            if (index >= 0) {
                this.currentCategory = categories[index];
                // Delete current Category to avoid problems with the formatTree.
                delete categories[index];
            }

            // Sort by depth and sortorder to avoid problems formatting Tree.
            categories.sort((a, b) => {
                if (a.depth == b.depth) {
                    return (a.sortorder > b.sortorder) ? 1 : ((b.sortorder > a.sortorder) ? -1 : 0);
                }

                return a.depth > b.depth ? 1 : -1;
            });

            this.categories = CoreUtils.formatTree(categories, 'parent', 'id', this.categoryId);

            if (this.currentCategory) {
                this.title = this.currentCategory.name;

                try {
                    this.categoryCourses = await CoreCourses.getCoursesByField('category', this.categoryId);
                    await this.filterEnrolled();
                } catch (error) {
                    !this.isDestroyed && CoreAlerts.showError(error, {
                        default: Translate.instant('core.courses.errorloadcourses'),
                    });
                }
            }

            this.logView();
        } catch (error) {
            !this.isDestroyed && CoreAlerts.showError(error, { default: Translate.instant('core.courses.errorloadcategories') });
        }
    }

    /**
     * Refresh the categories.
     *
     * @param refresher Refresher.
     */
    refreshCategories(refresher?: HTMLIonRefresherElement): void {
        const promises: Promise<void>[] = [];

        promises.push(CoreCourses.invalidateUserCourses());
        promises.push(CoreCourses.invalidateCategories(this.categoryId, true));
        promises.push(CoreCourses.invalidateCoursesByField('category', this.categoryId));
        promises.push(CoreSites.getRequiredCurrentSite().invalidateConfig());

        Promise.all(promises).finally(() => {
            this.fetchCategories().finally(() => {
                refresher?.complete();
            });
        });
    }

    /**
     * Open a category.
     *
     * @param categoryId Category Id.
     */
    openCategory(categoryId: number): void {
        CoreNavigator.navigateToSitePath(
            'courses/categories/' + categoryId,
            { params: {
                enrolled: this.showOnlyEnrolled,
            } },
        );
    }

    /**
     * Filter my courses or not.
     */
    async filterEnrolled(): Promise<void> {
        if (!this.showOnlyEnrolled) {
            this.courses = this.categoryCourses;
        } else {
            await Promise.all(this.categoryCourses.map(async (course) => {
                const isEnrolled = course.progress !== undefined;

                if (!isEnrolled) {
                    try {
                        const userCourse = await CoreCourses.getUserCourse(course.id);
                        course.progress = userCourse.progress;
                        course.completionusertracked = userCourse.completionusertracked;
                    } catch {
                        // Ignore errors.
                    }
                }
            }));
            this.courses = this.categoryCourses.filter((course) => 'progress' in course);
        }
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
