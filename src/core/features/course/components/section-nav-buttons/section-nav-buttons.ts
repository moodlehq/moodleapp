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

import { Component, computed, input, OnDestroy, output, signal } from '@angular/core';
import { CoreCourseSectionToDisplay } from '@features/course/components/course-section/course-section';
import { CoreSharedModule } from '@/core/shared.module';
import { CORE_COURSE_ALL_SECTIONS_ID } from '@features/course/constants';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreSites } from '@services/sites';
import { CoreEventObserver, CoreEvents } from '@static/events';

/**
 * Component to display previous/next section navigation buttons.
 *
 * Example usage:
 * <core-course-section-nav-buttons [currentSectionId]="selectedSection?.id" [allSections]="sections"
 *     [courseId]="course.id" (sectionChange)="sectionChanged($event)" />
 */
@Component({
    selector: 'core-course-section-nav-buttons',
    templateUrl: 'section-nav-buttons.html',
    styleUrl: 'section-nav-buttons.scss',
    imports: [
        CoreSharedModule,
    ],
})
export class CoreCourseSectionNavButtonsComponent implements OnDestroy {

    protected static readonly FEATURE_NAME = 'NoDelegate_CoreCourseSectionNavigation';

    readonly currentSectionId = input<number>();
    readonly allSections = input<CoreCourseSectionToDisplay[]>();
    readonly courseId = input.required<number>();

    protected readonly enabled = signal(false);

    readonly previousSection = computed(() => {
        const enabled = this.enabled();
        const currentSectionId = this.currentSectionId();
        const allSections = this.allSections();

        if (!enabled || currentSectionId === undefined || !allSections) {
            return undefined;
        }

        if (currentSectionId === CORE_COURSE_ALL_SECTIONS_ID) {
            return undefined;
        }

        const currentIndex = allSections.findIndex((section) => section.id === currentSectionId);
        for (let i = currentIndex - 1; i >= 1; i--) {
            if (CoreCourseHelper.canDisplaySectionOnCourse(allSections[i])) {
                return allSections[i];
            }
        }

        return undefined;
    });

    readonly nextSection = computed(() => {
        const enabled = this.enabled();
        const currentSectionId = this.currentSectionId();
        const allSections = this.allSections();

        if (!enabled || currentSectionId === undefined || !allSections) {
            return undefined;
        }

        if (currentSectionId === CORE_COURSE_ALL_SECTIONS_ID) {
            return undefined;
        }

        const currentIndex = allSections.findIndex((section) => section.id === currentSectionId);
        for (let i = currentIndex + 1; i < allSections.length; i++) {
            if (CoreCourseHelper.canDisplaySectionOnCourse(allSections[i])) {
                return allSections[i];
            }
        }

        return undefined;
    });

    readonly sectionChange = output<CoreCourseSectionToDisplay>();

    protected updateSiteObserver: CoreEventObserver;

    constructor() {
        const siteId = CoreSites.getCurrentSiteId();

        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.checkFeatureEnabled();
        }, siteId);

        this.checkFeatureEnabled();
    }

    /**
     * Check if the feature is enabled.
     */
    checkFeatureEnabled(): void {
        const site = CoreSites.getRequiredCurrentSite();

        const disabled = site.isFeatureDisabled(CoreCourseSectionNavButtonsComponent.FEATURE_NAME);
        this.enabled.set(!disabled);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.updateSiteObserver.off();
    }

}
