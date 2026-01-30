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

import { Component, computed, effect, input, signal } from '@angular/core';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseOverviewActivity, CoreCourseOverviewItem } from '@features/course/services/course-overview';
import { CoreIcons } from '@static/icons';
import { CoreObject } from '@static/object';
import { CoreIconMap } from '@services/icon-map';
import { CorePromiseUtils } from '@static/promise-utils';

/**
 * Component to display a pix icon in an overview item.
 */
@Component({
    selector: 'core-course-overview-item-pix-icon',
    templateUrl: 'overview-item-pix-icon.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class CoreCourseOverviewItemPixIconComponent {

    readonly courseId = input.required<number>();
    readonly activity = input.required<CoreCourseOverviewActivity>();
    readonly item = input.required<CoreCourseOverviewItem<CoreCoursePixIconExporterData>>();

    readonly icon = signal<string | null | undefined>(undefined); // Undefined => not loaded yet, null => loaded but not found.
    readonly extras = computed(() => CoreObject.toKeyValueMap(this.item().parsedData.extras ?? [], 'name', 'value'));

    constructor() {
        // Convert this effect to a resource once it's stable.
        effect(async () => {
            const parsedData = this.item().parsedData;
            if (!parsedData.pix || !parsedData.component) {
                this.icon.set(null);

                return;
            }

            this.icon.set(undefined); // Set is as not loaded yet.

            const iconClasses = await CorePromiseUtils.ignoreErrors(
                CoreIconMap.getIconClasses(parsedData.component, parsedData.pix),
            );
            if (!iconClasses) {
                this.icon.set(null);

                return;
            }

            const iconData = CoreIcons.getFontAwesomeIconDataFromClasses(iconClasses);
            if (!iconData) {
                this.icon.set(null);

                return;
            }

            this.icon.set(CoreIcons.prefixIconName('font-awesome', iconData.library, iconData.icon));
        });
    }

}

export type CoreCoursePixIconExporterData = {
    pix?: string | null; // The pix icon. E.g. i/checkedcircle.
    component?: string | null; // The component the icon belongs to.
    extras: { // The attributes of the icon.
        name: string;
        value: string;
    }[];
};
