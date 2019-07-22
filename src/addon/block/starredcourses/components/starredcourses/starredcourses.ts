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

import { Component, OnInit, OnDestroy, Injector, Input, OnChanges, SimpleChange } from '@angular/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSitesProvider } from '@providers/sites';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreCoursesHelperProvider } from '@core/courses/providers/helper';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreCourseOptionsDelegate } from '@core/course/providers/options-delegate';
import { AddonCourseCompletionProvider } from '@addon/coursecompletion/providers/coursecompletion';
import { CoreBlockBaseComponent } from '@core/block/classes/base-block-component';

/**
 * Component to render a starred courses block.
 */
@Component({
    selector: 'addon-block-starredcourses',
    templateUrl: 'addon-block-starredcourses.html'
})
export class AddonBlockStarredCoursesComponent extends CoreBlockBaseComponent implements OnInit, OnChanges, OnDestroy {
    @Input() downloadEnabled: boolean;

    courses = [];
    prefetchCoursesData = {
        icon: '',
        badge: ''
    };

    protected prefetchIconsInitialized = false;
    protected isDestroyed;
    protected coursesObserver;
    protected courseIds = [];
    protected fetchContentDefaultError = 'Error getting starred courses data.';

    constructor(injector: Injector, private coursesProvider: CoreCoursesProvider,
            private courseCompletionProvider: AddonCourseCompletionProvider, private eventsProvider: CoreEventsProvider,
            private courseHelper: CoreCourseHelperProvider, private utils: CoreUtilsProvider,
            private courseOptionsDelegate: CoreCourseOptionsDelegate, private coursesHelper: CoreCoursesHelperProvider,
            private sitesProvider: CoreSitesProvider) {

        super(injector, 'AddonBlockStarredCoursesComponent');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {

        this.coursesObserver = this.eventsProvider.on(CoreCoursesProvider.EVENT_MY_COURSES_UPDATED, () => {
            this.refreshContent();
        }, this.sitesProvider.getCurrentSiteId());

        super.ngOnInit();
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {
        if (changes.downloadEnabled && !changes.downloadEnabled.previousValue && this.downloadEnabled && this.loaded) {
            // Download all courses is enabled now, initialize it.
            this.initPrefetchCoursesIcons();
        }
    }

    /**
     * Perform the invalidate content function.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        const promises = [];

        promises.push(this.coursesProvider.invalidateUserCourses().finally(() => {
            // Invalidate course completion data.
            return this.utils.allPromises(this.courseIds.map((courseId) => {
                return this.courseCompletionProvider.invalidateCourseCompletion(courseId);
             }));
        }));

        promises.push(this.courseOptionsDelegate.clearAndInvalidateCoursesOptions());
        if (this.courseIds.length > 0) {
            promises.push(this.coursesProvider.invalidateCoursesByField('ids', this.courseIds.join(',')));
        }

        return this.utils.allPromises(promises).finally(() => {
            this.prefetchIconsInitialized = false;
        });
    }

    /**
     * Fetch the courses.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(): Promise<any> {
        return this.coursesHelper.getUserCoursesWithOptions('timemodified', 0, 'isfavourite').then((courses) => {
            this.courses = courses;

            this.initPrefetchCoursesIcons();
        });
    }

    /**
     * Initialize the prefetch icon for selected courses.
     */
    protected initPrefetchCoursesIcons(): void {
        if (this.prefetchIconsInitialized || !this.downloadEnabled) {
            // Already initialized.
            return;
        }

        this.prefetchIconsInitialized = true;

        this.courseHelper.initPrefetchCoursesIcons(this.courses, this.prefetchCoursesData).then((prefetch) => {
            this.prefetchCoursesData = prefetch;
        });
    }

    /**
     * Prefetch all the shown courses.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    prefetchCourses(): Promise<any> {
        const initialIcon = this.prefetchCoursesData.icon;

        return this.courseHelper.prefetchCourses(this.courses, this.prefetchCoursesData).catch((error) => {
            if (!this.isDestroyed) {
                this.domUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
                this.prefetchCoursesData.icon = initialIcon;
            }
        });
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.coursesObserver && this.coursesObserver.off();
    }
}
