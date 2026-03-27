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
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreSites, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@services/sites';
import { CoreEventObserver, CoreEvents } from '@static/events';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseNavigation, CoreCourseNavigationDirection } from '@features/course/services/course-navigation';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreAlerts } from '@services/overlays/alerts';
import { Translate } from '@singletons';
import { CorePromiseUtils } from '@static/promise-utils';

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
                    !this.nextModule(),
                    !this.previousModule(),
                    {
                        readingStrategy: CoreSitesReadingStrategy.PREFER_NETWORK,
                        siteId,
                    },
                );
            }
        }, siteId);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            await this.setNextAndPreviousModules(true, true, { readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE });
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
     * @param checkNext Check next module.
     * @param checkPrevious Check previous module.
     * @param options Options to get the sections.
     */
    protected async setNextAndPreviousModules(
        checkNext = true,
        checkPrevious = true,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<void> {
        const modules = await CoreCourseNavigation.getNextAndPreviousModules(
            this.courseId(),
            this.currentModuleId(),
            checkNext,
            checkPrevious,
            options,
        );

        if (!modules) {
            return;
        }

        if (checkNext) {
            this.nextModule.set(modules.nextModule);
        }
        if (checkPrevious) {
            this.previousModule.set(modules.previousModule);
        }
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
        const direction = next ? CoreCourseNavigationDirection.NEXT : CoreCourseNavigationDirection.PREVIOUS;

        let moduleToOpen = await CorePromiseUtils.ignoreErrors(CoreCourseNavigation.getNextOrPreviousModules(
            this.courseId(),
            this.currentModuleId(),
            direction,
            {
                readingStrategy: CoreSitesReadingStrategy.PREFER_NETWORK,
            },
        ));

        modal.dismiss();

        if (!moduleToOpen) {
            moduleToOpen = next ? this.nextModule() : this.previousModule();

            if (!moduleToOpen) {
                // It seems the module was hidden. Show a message.
                CoreAlerts.showError(
                    Translate.instant(next ? 'core.course.nextactivitynotfound' : 'core.course.previousactivitynotfound'),
                );

                return;
            }
        }

        await CoreCourseNavigation.navigateToActivity(moduleToOpen, direction, true);
    }

}
