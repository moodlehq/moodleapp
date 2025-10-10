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

import { Component, OnInit, signal } from '@angular/core';

import { CoreCourse, CoreCourseWSSection, sectionContentIsModule } from '@features/course/services/course';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseHelper, CoreCourseSection } from '@features/course/services/course-helper';
import { CoreNavigator } from '@services/navigator';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';
import { ModFeature, ModArchetype } from '@addons/mod/constants';
import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';
import { CoreCourseSectionComponent } from '@features/course/components/course-section/course-section';

/**
 * Page that displays all modules of a certain type in a course.
 */
@Component({
    selector: 'page-core-course-list-mod-type',
    templateUrl: 'list-mod-type.html',
    imports: [
        CoreSharedModule,
        CoreCourseSectionComponent,
    ],
})
export default class CoreCourseListModTypePage implements OnInit {

    private static readonly PAGE_LENGTH = 10; // How many activities should load each time showMoreActivities is called.

    readonly sections = signal<CoreCourseSection[]>([]);
    readonly title = signal('');
    readonly loaded = signal(false);
    readonly courseId = signal(0);
    readonly canLoadMore = signal(false);
    readonly lastShownSectionIndex = signal(-1);

    protected modName?: string;
    protected archetypes: Record<string, number> = {}; // To speed up the check of modules.
    protected logView: () => void;

    constructor() {
        this.logView = CoreTime.once(async () => {
            if (!this.modName) {
                return;
            }

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'core_course_get_contents',
                name: this.title(),
                data: { category: this.modName },
                url: (this.modName === 'resources' ? '/course/resources.php' : `/mod/${this.modName}/index.php`) +
                    `?id=${this.courseId()}`,
            });
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.title.set(CoreNavigator.getRouteParam('title') || '');
            this.courseId.set(CoreNavigator.getRequiredRouteParam('courseId'));
            this.modName = CoreNavigator.getRequiredRouteParam('modName');
        } catch (error) {
            CoreAlerts.showError(error);
            CoreNavigator.back();

            return;
        }

        try {
            await this.fetchData();
        } finally {
            this.loaded.set(true);
        }
    }

    /**
     * Fetches the data.
     */
    protected async fetchData(): Promise<void> {
        if (!this.courseId()) {
            return;
        }

        try {
            // Get all the modules in the course.
            let sections = await CoreCourse.getSections(this.courseId(), false, true);

            sections = this.filterSectionsAndContents(sections);

            const result = await CoreCourseHelper.addHandlerDataForModules(sections, this.courseId());

            this.sections.set(result.sections);

            this.lastShownSectionIndex.set(-1);
            this.showMoreActivities();
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error getting data' });
        }
    }

    /**
     * Given a list of sections, return only those with contents to display. Also filter the contents to only include
     * the ones that should be displayed.
     *
     * @param sections Sections.
     * @returns Filtered sections.
     */
    protected filterSectionsAndContents(sections: CoreCourseWSSection[]): CoreCourseWSSection[] {
        return sections.filter((section) => {
            section.summary = ''; // Don't show section summary.

            if (!section.contents.length || section.hiddenbynumsections) {
                return false;
            }

            section.contents = section.contents.filter((modOrSubsection) => {
                if (!sectionContentIsModule(modOrSubsection)) {
                    const formattedSections = this.filterSectionsAndContents([modOrSubsection]);

                    return !!formattedSections.length;
                }

                if (!CoreCourseHelper.canUserViewModule(modOrSubsection, section) ||
                    !CoreCourseModuleHelper.moduleHasView(modOrSubsection) ||
                    modOrSubsection.visibleoncoursepage === 0) {
                    // Ignore this module.
                    return false;
                }

                if (this.modName === 'resources') {
                    // Check that the module is a resource.
                    if (this.archetypes[modOrSubsection.modname] === undefined) {
                        this.archetypes[modOrSubsection.modname] = CoreCourseModuleDelegate.supportsFeature<number>(
                            modOrSubsection.modname,
                            ModFeature.MOD_ARCHETYPE,
                            ModArchetype.OTHER,
                        );
                    }

                    if (this.archetypes[modOrSubsection.modname] === ModArchetype.RESOURCE) {
                        return true;
                    }

                } else if (modOrSubsection.modname === this.modName) {
                    return true;
                }
            });

            return section.contents.length > 0;
        });
    }

    /**
     * Show more activities.
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     */
    showMoreActivities(infiniteComplete?: () => void): void {
        const sections = this.sections();
        let lastShownSectionIndex = this.lastShownSectionIndex();

        let modulesLoaded = 0;
        while (lastShownSectionIndex < sections.length - 1 && modulesLoaded < CoreCourseListModTypePage.PAGE_LENGTH) {
            lastShownSectionIndex++;

            const sectionModules = CoreCourse.getSectionsModules([sections[lastShownSectionIndex]]);
            modulesLoaded += sectionModules.length;
        }

        this.lastShownSectionIndex.set(lastShownSectionIndex);

        this.canLoadMore.set(lastShownSectionIndex < sections.length - 1);

        infiniteComplete?.();
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    async refreshData(refresher: HTMLIonRefresherElement): Promise<void> {
        await CorePromiseUtils.ignoreErrors(CoreCourse.invalidateSections(this.courseId()));

        try {
            await this.fetchData();
        } finally {
            refresher.complete();
        }
    }

}
