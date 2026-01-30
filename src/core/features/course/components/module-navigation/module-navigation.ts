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

import { Component, OnDestroy, OnInit, input, signal } from '@angular/core';
import { CoreCourse, CoreCourseWSSection } from '@features/course/services/course';
import { CoreCourseHelper, CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreEventObserver, CoreEvents } from '@static/events';
import { CoreAlerts } from '@services/overlays/alerts';
import { Translate } from '@singletons';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';

/**
 * Component to show a button to go to the next resource/activity.
 *
 * Example usage:
 * <core-course-module-navigation [courseId]="courseId" [currentModuleId]="moduleId"></core-course-module-navigation>
 */
@Component({
    selector: 'core-course-module-navigation',
    templateUrl: 'core-course-module-navigation.html',
    styleUrl: 'module-navigation.scss',
    imports: [
        CoreSharedModule,
    ],
    host: {
        '[class.empty]': '(!nextModule() && !previousModule())',
    },
})
export class CoreCourseModuleNavigationComponent implements OnInit, OnDestroy {

    readonly courseId = input.required<number>(); // Course ID.
    readonly currentModuleId = input.required<number>(); // Current module Id.

    readonly nextModule = signal<CoreCourseModuleData | undefined>(undefined);
    readonly previousModule = signal<CoreCourseModuleData | undefined>(undefined);
    readonly loaded = signal(false);

    protected completionObserver: CoreEventObserver;

    constructor() {
        const siteId = CoreSites.getCurrentSiteId();

        this.completionObserver = CoreEvents.on(CoreEvents.COMPLETION_MODULE_VIEWED, async (data) => {
            if (data?.courseId === this.courseId()) {
                // Check if now there's a next module.
                await this.setNextAndPreviousModules(
                    CoreSitesReadingStrategy.PREFER_NETWORK,
                    !this.nextModule(),
                    !this.previousModule(),
                );
            }
        }, siteId);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            await this.setNextAndPreviousModules(CoreSitesReadingStrategy.PREFER_CACHE);
        } finally {
            this.loaded.set(true);
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.completionObserver.off();
    }

    /**
     * Set previous and next modules.
     *
     * @param readingStrategy Reading strategy.
     * @param checkNext Check next module.
     * @param checkPrevious Check previous module.
     */
    protected async setNextAndPreviousModules(
        readingStrategy: CoreSitesReadingStrategy,
        checkNext = true,
        checkPrevious = true,
    ): Promise<void> {
        if (!checkNext && !checkPrevious) {
            return;
        }

        const preSets = CoreSites.getReadingStrategyPreSets(readingStrategy);

        const sections = await CoreCourse.getSections(this.courseId(), false, true, preSets);

        const modules = CoreCourse.getSectionsModules(sections, {
            ignoreSection: (section) => !this.isSectionAvailable(section),
        });

        const currentModuleIndex = modules.findIndex((module) => module.id === this.currentModuleId());
        if (currentModuleIndex < 0) {
            // Current module found. Return.
            return;
        }

        if (checkNext) {
            // Find next Module.
            this.nextModule.set(undefined);
            for (let i = currentModuleIndex + 1; i < modules.length && this.nextModule() === undefined; i++) {
                const module = modules[i];
                if (this.isModuleAvailable(module)) {
                    this.nextModule.set(module);
                }
            }
        }

        if (checkPrevious) {
            // Find previous Module.
            this.previousModule.set(undefined);
            for (let i = currentModuleIndex - 1; i >= 0 && this.previousModule() === undefined; i--) {
                const module = modules[i];
                if (this.isModuleAvailable(module)) {
                    this.previousModule.set(module);
                }
            }
        }
    }

    /**
     * Module is visible by the user and it has a specific view (e.g. not a label).
     *
     * @param module Module to check.
     * @returns Wether the module is available to the user or not.
     */
    protected isModuleAvailable(module: CoreCourseModuleData): boolean {
        return !CoreCourseHelper.isModuleStealth(module) && CoreCourseModuleHelper.moduleHasView(module);
    }

    /**
     * Section is visible by the user and its not stealth
     *
     * @param section Section to check.
     * @returns Wether the module is available to the user or not.
     */
    protected isSectionAvailable(section: CoreCourseWSSection): boolean {
        return CoreCourseHelper.canUserViewSection(section) && !CoreCourseHelper.isSectionStealth(section);
    }

    /**
     * Go to next/previous module.
     *
     * @param next True to go to next module, false to go to previous.
     */
    async goToActivity(next = true): Promise<void> {
        if (!this.loaded()) {
            return;
        }

        const modal = await CoreLoadings.show();

        // Re-calculate module in case a new module was made visible.
        await CorePromiseUtils.ignoreErrors(this.setNextAndPreviousModules(CoreSitesReadingStrategy.PREFER_NETWORK, next, !next));

        modal.dismiss();

        const module = next ? this.nextModule() : this.previousModule();
        if (!module) {
            // It seems the module was hidden. Show a message.
            CoreAlerts.showError(
                Translate.instant(next ? 'core.course.nextactivitynotfound' : 'core.course.previousactivitynotfound'),
            );

            return;
        }

        const options: CoreNavigationOptions = {
            replace: true,
            animationDirection: next ? 'forward' : 'back',
        };

        if (!CoreCourseHelper.canUserViewModule(module)) {
            options.params = {
                module,
            };
            CoreNavigator.navigateToSitePath(`course/${this.courseId()}/${module.id}/module-preview`, options);
        } else {
            CoreCourseModuleDelegate.openActivityPage(module.modname, module, this.courseId(), options);
        }
    }

}
