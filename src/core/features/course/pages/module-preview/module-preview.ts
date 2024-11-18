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

import { Component, OnInit } from '@angular/core';
import { CoreCourseModuleSummaryResult } from '@features/course/components/module-summary/module-summary';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseHelper, CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreModals } from '@services/modals';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@singletons/utils';

/**
 * Page that displays a module preview.
 */
@Component({
    selector: 'page-core-course-module-preview',
    templateUrl: 'module-preview.html',
    styleUrl: 'module-preview.scss',
})
export class CoreCourseModulePreviewPage implements OnInit {

    title!: string;
    module!: CoreCourseModuleData;
    courseId!: number;
    loaded = false;
    unsupported = false;
    isDisabledInSite = false;
    showManualCompletion = false;
    displayOpenInBrowser = false;

    protected debouncedUpdateModule?: () => void; // Update the module after a certain time.

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.module = CoreNavigator.getRequiredRouteParam<CoreCourseModuleData>('module');
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }

        this.displayOpenInBrowser = !!CoreSites.getCurrentSite()?.shouldDisplayInformativeLinks();
        this.debouncedUpdateModule = CoreUtils.debounce(() => {
            this.doRefresh();
        }, 10000);

        await this.fetchModule();
    }

    /**
     * Fetch module.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchModule(refresh = false): Promise<void> {
        if (refresh) {
            this.module = await CoreCourse.getModule(this.module.id, this.courseId);
        }

        await CoreCourseHelper.loadModuleOfflineCompletion(this.courseId, this.module);

        this.unsupported = !CoreCourseModuleDelegate.getHandlerName(this.module.modname);
        if (!this.unsupported) {
            this.module.handlerData =
                await CoreCourseModuleDelegate.getModuleDataFor(this.module.modname, this.module, this.courseId);
        } else {
            this.isDisabledInSite = CoreCourseModuleDelegate.isModuleDisabledInSite(this.module.modname);
        }

        this.title = this.module.name;

        this.showManualCompletion = await CoreCourseModuleDelegate.manualCompletionAlwaysShown(this.module);

        this.loaded = true;
    }

    /**
     * Opens a module summary page.
     */
    async openModuleSummary(): Promise<void> {
        if (!this.module) {
            return;
        }

        const { CoreCourseModuleSummaryComponent } = await import('@features/course/components/module-summary/module-summary');

        const data = await CoreModals.openSideModal<CoreCourseModuleSummaryResult>({
            component: CoreCourseModuleSummaryComponent,
            componentProps: {
                moduleId: this.module.id,
                module: this.module,
                description: this.module.description,
                component: this.module.modname,
                courseId: this.courseId,
                displayOptions: {
                    displayDescription: false,
                    displayBlog: false,
                },
            },
        });

        if (data) {
            if (this.loaded && data.action == 'refresh') {
                this.loaded = false;
                try {
                    await this.doRefresh(undefined);
                } finally {
                    this.loaded = true;
                }
            }
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @returns Promise resolved when done.
     */
    async doRefresh(refresher?: HTMLIonRefresherElement): Promise<void> {

        await CoreCourse.invalidateModule(this.module.id);

        this.fetchModule(true);

        refresher?.complete();
    }

    /**
     * The completion of the modules has changed.
     *
     * @returns Promise resolved when done.
     */
    async onCompletionChange(): Promise<void> {
        // Update the module data after a while.
        this.debouncedUpdateModule?.();
    }

}
