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

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';

import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import {
    CoreCourseHelper,
    CoreCourseModule,
    CoreCourseModuleCompletionData,
    CoreCourseSection,
} from '@features/course/services/course-helper';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseModuleDelegate, CoreCourseModuleHandlerButton } from '@features/course/services/module-delegate';
import {
    CoreCourseModulePrefetchDelegate,
    CoreCourseModulePrefetchHandler,
} from '@features/course/services/module-prefetch-delegate';

/**
 * Component to display a module entry in a list of modules.
 *
 * Example usage:
 *
 * <core-course-module [module]="module" [courseId]="courseId" (completionChanged)="onCompletionChange()"></core-course-module>
 */
@Component({
    selector: 'core-course-module',
    templateUrl: 'core-course-module.html',
    styleUrls: ['module.scss'],
})
export class CoreCourseModuleComponent implements OnInit, OnDestroy {

    @Input() module!: CoreCourseModule; // The module to render.
    @Input() courseId?: number; // The course the module belongs to.
    @Input() section?: CoreCourseSection; // The section the module belongs to.
    @Input() showActivityDates = false; // Whether to show activity dates.
    @Input() showCompletionConditions = false; // Whether to show activity completion conditions.
    // eslint-disable-next-line @angular-eslint/no-input-rename
    @Input('downloadEnabled') set enabled(value: boolean) {
        this.downloadEnabled = value;

        if (!this.module.handlerData?.showDownloadButton || !this.downloadEnabled || this.statusCalculated) {
            return;
        }

        // First time that the download is enabled. Initialize the data.
        this.statusCalculated = true;
        this.spinner = true; // Show spinner while calculating the status.

        // Get current status to decide which icon should be shown.
        this.calculateAndShowStatus();
    }

    @Output() completionChanged = new EventEmitter<CoreCourseModuleCompletionData>(); // Notify when module completion changes.
    @Output() statusChanged = new EventEmitter<CoreCourseModuleStatusChangedData>(); // Notify when the download status changes.

    downloadStatus?: string;
    canCheckUpdates?: boolean;
    spinner?: boolean; // Whether to display a loading spinner.
    downloadEnabled?: boolean; // Whether the download of sections and modules is enabled.
    modNameTranslated = '';
    hasInfo = false;
    showLegacyCompletion = false; // Whether to show module completion in the old format.
    showManualCompletion = false; // Whether to show manual completion when completion conditions are disabled.

    protected prefetchHandler?: CoreCourseModulePrefetchHandler;
    protected statusObserver?: CoreEventObserver;
    protected statusCalculated = false;
    protected isDestroyed = false;

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.courseId = this.courseId || this.module.course;
        this.modNameTranslated = CoreCourse.translateModuleName(this.module.modname) || '';
        this.showLegacyCompletion = !CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('3.11');
        this.checkShowManualCompletion();

        if (!this.module.handlerData) {
            return;
        }

        this.module.handlerData.a11yTitle = this.module.handlerData.a11yTitle ?? this.module.handlerData.title;
        this.hasInfo = !!(
            this.module.description ||
            (this.showActivityDates && this.module.dates && this.module.dates.length) ||
            (this.module.completiondata &&
                ((this.showManualCompletion && !this.module.completiondata.isautomatic) ||
                    (this.showCompletionConditions && this.module.completiondata.isautomatic))
            )
        );

        if (this.module.handlerData.showDownloadButton) {
            // Listen for changes on this module status, even if download isn't enabled.
            this.prefetchHandler = CoreCourseModulePrefetchDelegate.getPrefetchHandlerFor(this.module);
            this.canCheckUpdates = CoreCourseModulePrefetchDelegate.canCheckUpdates();

            this.statusObserver = CoreEvents.on(CoreEvents.PACKAGE_STATUS_CHANGED, (data) => {
                if (!this.module || data.componentId != this.module.id || !this.prefetchHandler ||
                        data.component != this.prefetchHandler.component) {
                    return;
                }

                // Call determineModuleStatus to get the right status to display.
                const status = CoreCourseModulePrefetchDelegate.determineModuleStatus(this.module, data.status);

                if (this.downloadEnabled) {
                    // Download is enabled, show the status.
                    this.showStatus(status);
                } else if (this.module.handlerData?.updateStatus) {
                    // Download isn't enabled but the handler defines a updateStatus function, call it anyway.
                    this.module.handlerData.updateStatus(status);
                }
            }, CoreSites.getCurrentSiteId());
        }
    }

    /**
     * Check whether manual completion should be shown.
     */
    protected async checkShowManualCompletion(): Promise<void> {
        this.showManualCompletion = this.showCompletionConditions ||
            await CoreCourseModuleDelegate.manualCompletionAlwaysShown(this.module);
    }

    /**
     * Function called when the module is clicked.
     *
     * @param event Click event.
     */
    moduleClicked(event: Event): void {
        if (this.module.uservisible !== false && this.module.handlerData?.action) {
            this.module.handlerData.action(event, this.module, this.courseId!);
        }
    }

    /**
     * Function called when a button is clicked.
     *
     * @param event Click event.
     * @param button The clicked button.
     */
    buttonClicked(event: Event, button: CoreCourseModuleHandlerButton): void {
        if (!button || !button.action) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        button.action(event, this.module!, this.courseId!);
    }

    /**
     * Download the module.
     *
     * @param refresh Whether it's refreshing.
     * @return Promise resolved when done.
     */
    async download(refresh: boolean): Promise<void> {
        if (!this.prefetchHandler || !this.module) {
            return;
        }

        // Show spinner since this operation might take a while.
        this.spinner = true;

        try {
            // Get download size to ask for confirm if it's high.
            const size = await this.prefetchHandler.getDownloadSize(this.module, this.courseId!, true);

            await CoreCourseHelper.prefetchModule(this.prefetchHandler, this.module, size, this.courseId!, refresh);

            const eventData = {
                sectionId: this.section?.id,
                moduleId: this.module.id,
                courseId: this.courseId!,
            };
            this.statusChanged.emit(eventData);
        } catch (error) {
            // Error, hide spinner.
            this.spinner = false;
            if (!this.isDestroyed) {
                CoreDomUtils.showErrorModalDefault(error, 'core.errordownloading', true);
            }
        }
    }

    /**
     * Show download buttons according to module status.
     *
     * @param status Module status.
     */
    protected showStatus(status: string): void {
        if (!status) {
            return;
        }

        this.spinner = false;
        this.downloadStatus = status;

        this.module.handlerData?.updateStatus?.(status);
    }

    /**
     * Calculate and show module status.
     *
     * @return Promise resolved when done.
     */
    protected async calculateAndShowStatus(): Promise<void> {
        if (!this.module || !this.courseId) {
            return;
        }

        const status = await CoreCourseModulePrefetchDelegate.getModuleStatus(this.module, this.courseId);

        this.showStatus(status);
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        // this.statusObserver?.off();
        this.module.handlerData?.onDestroy?.();
        this.isDestroyed = true;
    }

}

/**
 * Data sent to the status changed output.
 */
export type CoreCourseModuleStatusChangedData = {
    moduleId: number;
    courseId: number;
    sectionId?: number;
};
