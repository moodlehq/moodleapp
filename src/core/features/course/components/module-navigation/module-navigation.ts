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

import { Component, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';
import { CoreCourse, CoreCourseWSSection } from '@features/course/services/course';
import { CoreCourseHelper, CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { IonContent } from '@ionic/angular';
import { CoreLoadings } from '@services/loadings';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreEventObserver, CoreEvents } from '@singletons/events';

/**
 * Component to show a button to go to the next resource/activity.
 *
 * Example usage:
 * <core-course-module-navigation [courseId]="courseId" [currentModuleId]="moduleId"></core-course-module-navigation>
 */
@Component({
    selector: 'core-course-module-navigation',
    templateUrl: 'core-course-module-navigation.html',
    styleUrls: ['module-navigation.scss'],
})
export class CoreCourseModuleNavigationComponent implements OnInit, OnDestroy {

    @Input({ required: true }) courseId!: number; // Course ID.
    @Input({ required: true }) currentModuleId!: number; // Current module Id.

    nextModule?: CoreCourseModuleData;
    previousModule?: CoreCourseModuleData;
    nextModuleSection?: CoreCourseWSSection;
    previousModuleSection?: CoreCourseWSSection;
    loaded = false;
    element: HTMLElement;

    protected completionObserver: CoreEventObserver;

    constructor(protected ionContent: IonContent, element: ElementRef) {
        const siteId = CoreSites.getCurrentSiteId();
        this.element = element.nativeElement;

        this.completionObserver = CoreEvents.on(CoreEvents.COMPLETION_MODULE_VIEWED, async (data) => {
            if (data && data.courseId == this.courseId) {
                // Check if now there's a next module.
                await this.setNextAndPreviousModules(
                    CoreSitesReadingStrategy.PREFER_NETWORK,
                    !this.nextModule,
                    !this.previousModule,
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
            this.loaded = true;
        }
    }

    /**
     * @inheritdoc
     */
    async ngOnDestroy(): Promise<void> {
        this.completionObserver.off();
    }

    /**
     * Set previous and next modules.
     *
     * @param readingStrategy Reading strategy.
     * @param checkNext Check next module.
     * @param checkPrevious Check previous module.
     * @returns Promise resolved when done.
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

        const sections = await CoreCourse.getSections(this.courseId, false, true, preSets);

        // Search the next module.
        let currentModuleIndex = -1;

        const currentSectionIndex = sections.findIndex((section) => {
            if (!this.isSectionAvailable(section)) {
                // User cannot view the section, skip it.
                return false;
            }

            currentModuleIndex = section.modules.findIndex((module: CoreCourseModuleData) => module.id == this.currentModuleId);

            return currentModuleIndex >= 0;
        });

        if (currentSectionIndex < 0) {
            // Nothing found. Return.

            return;
        }

        if (checkNext) {
            // Find next Module.
            this.nextModule = undefined;
            for (let i = currentSectionIndex; i < sections.length && this.nextModule == undefined; i++) {
                const section = sections[i];

                if (!this.isSectionAvailable(section)) {
                    // User cannot view the section, skip it.
                    continue;
                }

                const startModule = i == currentSectionIndex ? currentModuleIndex + 1 : 0;
                for (let j = startModule; j < section.modules.length && this.nextModule == undefined; j++) {
                    const module = section.modules[j];

                    const found = await this.isModuleAvailable(module);
                    if (found) {
                        this.nextModule = module;
                        this.nextModuleSection = section;
                    }
                }
            }
        }

        if (checkPrevious) {
            // Find previous Module.
            this.previousModule = undefined;
            for (let i = currentSectionIndex; i >= 0 && this.previousModule == undefined; i--) {
                const section = sections[i];

                if (!this.isSectionAvailable(section)) {
                    // User cannot view the section, skip it.
                    continue;
                }

                const startModule = i == currentSectionIndex ? currentModuleIndex - 1 : section.modules.length - 1;
                for (let j = startModule; j >= 0 && this.previousModule == undefined; j--) {
                    const module = section.modules[j];

                    const found = await this.isModuleAvailable(module);
                    if (found) {
                        this.previousModule = module;
                        this.previousModuleSection = section;
                    }
                }
            }
        }

        this.element.classList.toggle('empty', !this.nextModule && !this.previousModule);
    }

    /**
     * Module is visible by the user and it has a specific view (e.g. not a label).
     *
     * @param module Module to check.
     * @returns Wether the module is available to the user or not.
     */
    protected async isModuleAvailable(module: CoreCourseModuleData): Promise<boolean> {
        return !CoreCourseHelper.isModuleStealth(module) && CoreCourse.instance.moduleHasView(module);
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
     * @returns Promise resolved when done.
     */
    async goToActivity(next = true): Promise<void> {
        if (!this.loaded) {
            return;
        }

        const modal = await CoreLoadings.show();

        // Re-calculate module in case a new module was made visible.
        await CoreUtils.ignoreErrors(this.setNextAndPreviousModules(CoreSitesReadingStrategy.PREFER_NETWORK, next, !next));

        modal.dismiss();

        const module = next ? this.nextModule : this.previousModule;
        if (!module) {
            // It seems the module was hidden. Show a message.
            CoreDomUtils.instance.showErrorModal(
                next ? 'core.course.nextactivitynotfound' : 'core.course.previousactivitynotfound',
                true,
            );

            return;
        }

        const options: CoreNavigationOptions = {
            replace: true,
            animationDirection: next ? 'forward' : 'back',
        };

        if (!CoreCourseHelper.canUserViewModule(module)) {
            const section = next ? this.nextModuleSection : this.previousModuleSection;
            options.params = {
                module,
                section,
            };
            CoreNavigator.navigateToSitePath('course/' + this.courseId + '/' + module.id +'/module-preview', options);
        } else {
            CoreCourseModuleDelegate.openActivityPage(module.modname, module, this.courseId, options);
        }
    }

}
