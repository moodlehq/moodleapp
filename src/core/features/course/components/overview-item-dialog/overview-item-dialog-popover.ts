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

import { Component, computed, input } from '@angular/core';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Popover to display the overview item dialog content.
 */
@Component({
    selector: 'core-course-overview-item-dialog-popover',
    templateUrl: 'overview-item-dialog-popover.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class CoreCourseOverviewItemDialogPopoverComponent {

    readonly courseId = input<number>();
    readonly cmId = input<number>();
    readonly title = input<string>();
    readonly description = input<string>();
    readonly items = input<{ label: string; value: string }[]>([]);

    // Wrap items values in a span to be able to apply styles like it's done in LMS.
    readonly formattedItems = computed(() => this.items().map((item) => ({
        label: item.label,
        value: `<span class="core-course-overview-item-dialog-item-value">${item.value}</span>`,
    })));

}
