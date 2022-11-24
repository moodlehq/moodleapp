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
import {
    CoreCourseModuleData,
    CoreCourseModuleCompletionData,
    CoreCourseSection,
    CoreCourseHelper,
} from '@features/course/services/course-helper';
import { CoreCourse, CoreCourseModuleCompletionStatus, CoreCourseModuleCompletionTracking } from '@features/course/services/course';
import { CoreCourseModuleDelegate, CoreCourseModuleHandlerButton } from '@features/course/services/module-delegate';
import {
    CoreCourseModulePrefetchDelegate,
    CoreCourseModulePrefetchHandler,
} from '@features/course/services/module-prefetch-delegate';
import { CoreConstants } from '@/core/constants';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { BehaviorSubject } from 'rxjs';

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

    @Input() module!: CoreCourseModuleData; // The module to render.
    @Input() section?: CoreCourseSection; // The section the module belongs to.
    @Input() showActivityDates = false; // Whether to show activity dates.
    @Input() showCompletionConditions = false; // Whether to show activity completion conditions.
    @Input() showLegacyCompletion?: boolean; // Whether to show module completion in the old format.
    @Input() isLastViewed = false; // Whether it's the last module viewed in a course.
    @Output() completionChanged = new EventEmitter<CoreCourseModuleCompletionData>(); // Notify when module completion changes.

    modNameTranslated = '';
    hasInfo = false;
    showManualCompletion = false; // Whether to show manual completion when completion conditions are disabled.
    prefetchStatusIcon$ = new BehaviorSubject<string>(''); // Module prefetch status icon.
    prefetchStatusText$ = new BehaviorSubject<string>(''); // Module prefetch status text.
    autoCompletionTodo = false;
    moduleHasView = true;

    protected prefetchHandler?: CoreCourseModulePrefetchHandler;

    protected moduleStatusObserver?: CoreEventObserver;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.modNameTranslated = CoreCourse.translateModuleName(this.module.modname) || '';
        this.showLegacyCompletion = this.showLegacyCompletion ??
            CoreConstants.CONFIG.uselegacycompletion ??
            !CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('3.11');
        this.checkShowManualCompletion();

        if (!this.module.handlerData) {
            return;
        }

        this.module.handlerData.a11yTitle = this.module.handlerData.a11yTitle ?? this.module.handlerData.title;
        this.moduleHasView = CoreCourse.moduleHasView(this.module);

        const completionStatus = this.showCompletionConditions && this.module.completiondata?.isautomatic &&
            this.module.completiondata.tracking == CoreCourseModuleCompletionTracking.COMPLETION_TRACKING_AUTOMATIC
            ? this.module.completiondata.state
            : undefined;

        this.autoCompletionTodo = completionStatus == CoreCourseModuleCompletionStatus.COMPLETION_INCOMPLETE ||
            completionStatus == CoreCourseModuleCompletionStatus.COMPLETION_COMPLETE_FAIL;

        this.hasInfo = !!(
            this.module.description ||
            (this.showActivityDates && this.module.dates && this.module.dates.length) ||
            (this.autoCompletionTodo && !this.showLegacyCompletion) ||
            (this.module.availabilityinfo)
        );

        if (this.module.handlerData?.showDownloadButton) {
            const status = await CoreCourseModulePrefetchDelegate.getModuleStatus(this.module, this.module.course);
            this.updateModuleStatus(status);

            // Listen for changes on this module status, even if download isn't enabled.
            this.prefetchHandler = CoreCourseModulePrefetchDelegate.getPrefetchHandlerFor(this.module.modname);
            if (!this.prefetchHandler) {
                return;
            }

            this.moduleStatusObserver = CoreEvents.on(CoreEvents.PACKAGE_STATUS_CHANGED, (data) => {
                if (this.module.id != data.componentId || data.component != this.prefetchHandler?.component) {
                    return;
                }

                let status = data.status;
                if (this.prefetchHandler.determineStatus) {
                    // Call determineStatus to get the right status to display.
                    status = this.prefetchHandler.determineStatus(this.module, status, true);
                }

                // Update the status.
                this.updateModuleStatus(status);
            }, CoreSites.getCurrentSiteId());
        }
    }

    /**
     * Show module status.
     *
     * @param prefetchstatus Module status.
     */
    protected updateModuleStatus(prefetchstatus: string): void {
        if (!prefetchstatus) {
            return;
        }

        switch (prefetchstatus) {
            case CoreConstants.OUTDATED:
                this.prefetchStatusIcon$.next(CoreConstants.ICON_OUTDATED);
                this.prefetchStatusText$.next('core.outdated');
                break;
            case CoreConstants.DOWNLOADED:
                this.prefetchStatusIcon$.next(CoreConstants.ICON_DOWNLOADED);
                this.prefetchStatusText$.next('core.downloaded');
                break;
            default:
                this.prefetchStatusIcon$.next('');
                this.prefetchStatusText$.next('');
                break;
        }

        this.module.handlerData?.updateStatus?.(prefetchstatus);
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
        if (CoreCourseHelper.canUserViewModule(this.module, this.section) && this.module.handlerData?.action) {
            this.module.handlerData.action(event, this.module, this.module.course);
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

        button.action(event, this.module, this.module.course);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.module.handlerData?.onDestroy?.();
        this.moduleStatusObserver?.off();
    }

}
