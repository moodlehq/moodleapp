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

import { Injectable } from '@angular/core';
import { CoreNavigationOptionsWithSite, CoreNavigator } from '@services/navigator';
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { makeSingleton } from '@singletons';
import { CoreCourseHelper, CoreCourseModuleData } from './course-helper';
import { CoreCourseModuleDelegate } from './module-delegate';
import { CoreCourse, CoreCourseWSSection } from './course';
import { CoreCourseModuleHelper } from './course-module-helper';

/**
 * Service that provides some features regarding a course navigation.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseNavigationService {

    /**
     * Module is visible by the user and it has a specific view (e.g. not a label).
     *
     * @param module Module to check.
     * @returns Whether the module is available to the user or not.
     */
    protected isModuleAvailable(module: CoreCourseModuleData): boolean {
        return !CoreCourseHelper.isModuleStealth(module) && CoreCourseModuleHelper.moduleHasView(module);
    }

    /**
     * Section is visible by the user and it's not stealth
     *
     * @param section Section to check.
     * @returns Whether the section is available to the user or not.
     */
    protected isSectionAvailable(section: CoreCourseWSSection): boolean {
        return CoreCourseHelper.canUserViewSection(section) && !CoreCourseHelper.isSectionStealth(section);
    }

    /**
     * Get previous and next modules.
     *
     * @param courseId Course ID.
     * @param currentModuleId Current module ID from where to calculate the next/previous one.
     * @param checkNext Check next module.
     * @param checkPrevious Check previous module.
     * @param options Options to get the sections.
     * @returns Next and previous modules. If both checkNext and checkPrevious are false, it will return undefined.
     */
    async getNextAndPreviousModules(
        courseId: number,
        currentModuleId: number,
        checkNext = true,
        checkPrevious = true,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<{ nextModule?: CoreCourseModuleData; previousModule?: CoreCourseModuleData } | undefined> {
        if (!checkNext && !checkPrevious) {
            return;
        }

        const siteId = options.siteId || CoreSites.getCurrentSiteId();
        const preSets = CoreSites.getReadingStrategyPreSets(options.readingStrategy);

        const sections = await CoreCourse.getSections(courseId, false, true, preSets, siteId);

        const modules = CoreCourse.getSectionsModules(sections, {
            ignoreSection: (section) => !this.isSectionAvailable(section),
        });

        const currentModuleIndex = modules.findIndex((module) => module.id === currentModuleId);
        if (currentModuleIndex < 0) {
            // Current module not found. Return.
            return;
        }

        const nextModule = checkNext
            ? this.getAdjacentModule(modules, currentModuleIndex, CoreCourseNavigationDirection.NEXT)
            : undefined;
        const previousModule = checkPrevious
            ? this.getAdjacentModule(modules, currentModuleIndex, CoreCourseNavigationDirection.PREVIOUS)
            : undefined;

        return {
            nextModule,
            previousModule,
        };
    }

    /**
     * Get previous or next modules.
     *
     * @param courseId Course ID.
     * @param currentModuleId Current module ID from where to calculate the next/previous one.
     * @param direction Direction to go (next or previous).
     * @param options Options to get the sections.
     * @returns Adjacent module in the specified direction if found.
     */
    async getNextOrPreviousModules(
        courseId: number,
        currentModuleId: number,
        direction = CoreCourseNavigationDirection.NEXT,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<CoreCourseModuleData | undefined> {
        const next = direction === CoreCourseNavigationDirection.NEXT;
        const modules = await this.getNextAndPreviousModules(courseId, currentModuleId, next, !next, options);

        return next ? modules?.nextModule : modules?.previousModule;
    }

    /**
     * Get the adjacent module in a direction.
     *
     * @param modules List of modules.
     * @param currentModuleIndex Index of the current module.
     * @param direction Direction to go (next or previous).
     * @returns Adjacent module in the specified direction if found.
     */
    protected getAdjacentModule(
        modules: CoreCourseModuleData[],
        currentModuleIndex: number,
        direction = CoreCourseNavigationDirection.NEXT,
    ): CoreCourseModuleData | undefined {
        let adjacentModule: CoreCourseModuleData | undefined = undefined;

        if (direction === CoreCourseNavigationDirection.NEXT) {
            // Find next Module.
            for (let i = currentModuleIndex + 1; i < modules.length && adjacentModule === undefined; i++) {
                const module = modules[i];
                if (this.isModuleAvailable(module)) {
                    adjacentModule = module;
                }
            }

        } else {
            // Find previous Module.
            for (let i = currentModuleIndex - 1; i >= 0 && adjacentModule === undefined; i--) {
                const module = modules[i];
                if (this.isModuleAvailable(module)) {
                    adjacentModule = module;
                }
            }
        }

        return adjacentModule;
    }

    /**
     * Navigate to an activity.
     *
     * @param module Module to open.
     * @param direction Direction to go (next or previous).
     * @param replaceCurrentNavigationPage Whether to replace the current page in the navigation stack or not. Defaults to true.
     * @param siteId Site ID. If not defined, current site.
     */
    async navigateToActivity(
        module: CoreCourseModuleData,
        direction = CoreCourseNavigationDirection.NEXT,
        replaceCurrentNavigationPage = true,
        siteId?: string,
    ): Promise<void> {

        const options: CoreNavigationOptionsWithSite = {
            replace: replaceCurrentNavigationPage,
            animationDirection:
                !replaceCurrentNavigationPage || direction === CoreCourseNavigationDirection.NEXT ? 'forward' : 'back',
            siteId,
        };

        if (!CoreCourseHelper.canUserViewModule(module)) {
            options.params = {
                module,
            };
            await CoreNavigator.navigateToSitePath(`course/${module.course}/${module.id}/module-preview`, options);
        } else {
            await CoreCourseModuleDelegate.openActivityPage(module.modname, module, module.course, options);
        }
    }

}
export const CoreCourseNavigation = makeSingleton(CoreCourseNavigationService);

export enum CoreCourseNavigationDirection {
    PREVIOUS = 'previous',
    NEXT = 'next',
};
