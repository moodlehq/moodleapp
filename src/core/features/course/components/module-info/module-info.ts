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

import { toBoolean } from '@/core/transforms/boolean';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';
import { CoreCourseModuleCompletionData, CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreSites } from '@services/sites';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseModuleCompletionComponent } from '../module-completion/module-completion';
import { CoreRemindersDateComponent } from '../../../reminders/components/date/date';

/**
 * Display info about a module:
 *
 * Description:
 * Module descriptions are shortened by default, allowing the user to see the full description by clicking in it.
 *
 * Completion dates, status and buttons.
 *
 * You can add also add custom information that will be included at the end.
 */
@Component({
    selector: 'core-course-module-info',
    templateUrl: 'core-course-module-info.html',
    styleUrl: 'course-module-info.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreCourseModuleCompletionComponent,
        CoreRemindersDateComponent,
    ],
})
export class CoreCourseModuleInfoComponent implements OnInit {

    @Input({ required: true }) module!: CoreCourseModuleData; // The module to render.
    @Input({ required: true }) courseId!: number; // The courseId the module belongs to.

    @Input({ required: true }) component!: string; // Component for format text directive.
    @Input({ required: true }) componentId!: string | number; // Component ID to use in conjunction with the component.

    @Input() description?: string | false; // The description to display. If false, no description will be shown.
    @Input({ transform: toBoolean }) expandDescription = false; // If the description should be expanded by default.

    @Input({ transform: toBoolean }) showAvailabilityInfo = false; // If show availability info on the box.

    @Input({ transform: toBoolean }) hasDataToSync = false; // If the activity has any data to be synced.

    @Input({ transform: toBoolean }) showManualCompletion = true; // Whether to show manual completion, true by default.
    @Output() completionChanged = new EventEmitter<CoreCourseModuleCompletionData>(); // Notify when completion changes.

    modicon = '';
    showCompletion = false; // Whether to show completion.
    moduleNameTranslated = '';

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.modicon = await CoreCourseModuleDelegate.getModuleIconSrc(this.module.modname, this.module.modicon, this.module);

        this.moduleNameTranslated = CoreCourseModuleHelper.translateModuleName(this.module.modname, this.module.modplural);
        this.showCompletion = CoreSites.getRequiredCurrentSite().isVersionGreaterEqualThan('3.11');
    }

}
