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

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { IonSearchbar, IonRefresher } from '@ionic/angular';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import {
    CoreCoursesProvider,
    CoreCourses,
} from '../../services/courses';
import { CoreCoursesHelper, CoreEnrolledCourseDataWithExtraInfoAndOptions } from '../../services/courses-helper';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreConstants } from '@/core/constants';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { CoreNavigator } from '@services/navigator';
import { Translate } from '@singletons';

/**
 * Page that displays the list of courses the user is enrolled in.
 */
@Component({
    selector: 'page-core-courses-my-courses',
    templateUrl: 'my-courses.html',
})
export class CoreCoursesMyCoursesPage implements OnInit, OnDestroy {

    @ViewChild(IonSearchbar) searchbar!: IonSearchbar;

    courses: CoreEnrolledCourseDataWithExtraInfoAndOptions[] = [];
    filteredCourses: CoreEnrolledCourseDataWithExtraInfoAndOptions[] = [];
    searchEnabled = false;
    filter = '';
    showFilter = false;
    coursesLoaded = false;
    downloadAllCoursesIcon = CoreConstants.ICON_NOT_DOWNLOADED;
    downloadAllCoursesLoading = false;
    downloadAllCoursesBadge = '';
    downloadAllCoursesEnabled = false;
    downloadAllCoursesCount?: number;
    downloadAllCoursesTotal?: number;
    downloadAllCoursesBadgeA11yText = '';

    protected myCoursesObserver: CoreEventObserver;
    protected siteUpdatedObserver: CoreEventObserver;
    protected isDestroyed = false;
    protected courseIds = '';

    constructor() {
        // Update list if user enrols in a course.
        this.myCoursesObserver = CoreEvents.on(
            CoreCoursesProvider.EVENT_MY_COURSES_UPDATED,
            (data) => {

                if (data.action == CoreCoursesProvider.ACTION_ENROL) {
                    this.fetchCourses();
                }
            },

            CoreSites.getCurrentSiteId(),
        );

        // Refresh the enabled flags if site is updated.
        this.siteUpdatedObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.searchEnabled = !CoreCourses.isSearchCoursesDisabledInSite();
            this.downloadAllCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();
        }, CoreSites.getCurrentSiteId());
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.searchEnabled = !CoreCourses.isSearchCoursesDisabledInSite();
        this.downloadAllCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();

        this.fetchCourses().finally(() => {
            this.coursesLoaded = true;
        });
    }

    /**
     * Fetch the user courses.
     *
     * @return Promise resolved when done.
     */
    protected async fetchCourses(): Promise<void> {
        try {
            const courses: CoreEnrolledCourseDataWithExtraInfoAndOptions[] = await CoreCourses.getUserCourses();
            const courseIds = courses.map((course) => course.id);

            this.courseIds = courseIds.join(',');

            await CoreCoursesHelper.loadCoursesExtraInfo(courses);

            if (CoreCourses.canGetAdminAndNavOptions()) {
                const options = await CoreCourses.getCoursesAdminAndNavOptions(courseIds);
                courses.forEach((course) => {
                    course.navOptions = options.navOptions[course.id];
                    course.admOptions = options.admOptions[course.id];
                });
            }

            this.courses = courses;
            this.filteredCourses = this.courses;
            this.filter = '';
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
        promises.push(CoreCourseOptionsDelegate.clearAndInvalidateCoursesOptions());
        if (this.courseIds) {
            promises.push(CoreCourses.invalidateCoursesByField('ids', this.courseIds));
        }

        Promise.all(promises).finally(() => {
            this.fetchCourses().finally(() => {
                refresher?.complete();
            });
        });
    }

    /**
     * Show or hide the filter.
     */
    switchFilter(): void {
        this.filter = '';
        this.showFilter = !this.showFilter;
        this.filteredCourses = this.courses;
        if (this.showFilter) {
            setTimeout(() => {
                this.searchbar.setFocus();
            }, 500);
        }
    }

    /**
     * The filter has changed.
     *
     * @param Received Event.
     */
    filterChanged(event?: Event): void {
        const target = <HTMLInputElement>event?.target || null;
        const newValue = target ? String(target.value).trim().toLowerCase() : null;
        if (!newValue || !this.courses) {
            this.filteredCourses = this.courses;
        } else {
            // Use displayname if available, or fullname if not.
            if (this.courses.length > 0 && typeof this.courses[0].displayname != 'undefined') {
                this.filteredCourses = this.courses.filter((course) => course.displayname!.toLowerCase().indexOf(newValue) > -1);
            } else {
                this.filteredCourses = this.courses.filter((course) => course.fullname.toLowerCase().indexOf(newValue) > -1);
            }
        }
    }

    /**
     * Prefetch all the courses.
     *
     * @return Promise resolved when done.
     */
    async prefetchCourses(): Promise<void> {
        this.downloadAllCoursesLoading = true;

        try {
            await CoreCourseHelper.confirmAndPrefetchCourses(this.courses, (progress) => {
                this.downloadAllCoursesBadge = progress.count + ' / ' + progress.total;
                this.downloadAllCoursesBadgeA11yText =
                    Translate.instant('core.course.downloadcoursesprogressdescription', progress);
                this.downloadAllCoursesCount = progress.count;
                this.downloadAllCoursesTotal = progress.total;
            });
        } catch (error) {
            if (!this.isDestroyed) {
                CoreDomUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
            }
        }

        this.downloadAllCoursesBadge = '';
        this.downloadAllCoursesLoading = false;
    }

    /**
     * Go to search courses.
     */
    openSearch(): void {
        CoreNavigator.navigateToSitePath('courses/search');
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.myCoursesObserver?.off();
        this.siteUpdatedObserver?.off();
    }

}
