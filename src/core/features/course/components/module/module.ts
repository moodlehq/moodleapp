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
} from '@features/course/services/course-helper';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseModuleDelegate, CoreCourseModuleHandlerButton } from '@features/course/services/module-delegate';

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
    @Output() completionChanged = new EventEmitter<CoreCourseModuleCompletionData>(); // Notify when module completion changes.

    modNameTranslated = '';
    hasInfo = false;
    showLegacyCompletion = false; // Whether to show module completion in the old format.
    showManualCompletion = false; // Whether to show manual completion when completion conditions are disabled.

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
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
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.module.handlerData?.onDestroy?.();
    }

}
