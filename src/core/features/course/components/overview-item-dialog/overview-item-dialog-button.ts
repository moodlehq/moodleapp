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

import { Component, input } from '@angular/core';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseOverviewActivity, CoreCourseOverviewItem } from '@features/course/services/course-overview';
import { CorePopovers } from '@services/overlays/popovers';

/**
 * Component to display a button to open a dialog in an overview item.
 */
@Component({
    selector: 'core-course-overview-item-dialog-button',
    templateUrl: 'overview-item-dialog-button.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class CoreCourseOverviewItemDialogButtonComponent {

    readonly courseId = input.required<number>();
    readonly activity = input.required<CoreCourseOverviewActivity>();
    readonly item = input.required<CoreCourseOverviewItem<ItemData>>();

    /**
     * Open the dialog.
     *
     * @param event Click event.
     */
    async openDialog(event: Event): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        let target: HTMLElement | null = event.target as HTMLElement;
        if (target && target.tagName !== 'ION-BUTTON') {
            target = target.parentElement;
        }

        const { CoreCourseOverviewItemDialogPopoverComponent } =
            await import('./overview-item-dialog-popover');

        CorePopovers.openWithoutResult({
            component: CoreCourseOverviewItemDialogPopoverComponent,
            componentProps: {
                courseId: this.courseId(),
                cmId: this.activity().cmid,
                title: this.item().parsedData.title,
                description: this.item().parsedData.description,
                items: this.item().parsedData.items,
            },
            event: { target } as Event,
        });
    }

}

type ItemData = {
    buttoncontent: string; // The content of the button.
    disabled: boolean; // Whether the dialog is disabled or not.
    title: string; // The title of the overview dialog content.
    description: string; // The description of the overview dialog content.
    items: { // The list of items in the overview dialog.
        label: string; // The label of the item.
        value: string; // The value of the item.
    }[];
};
