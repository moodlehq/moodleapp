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

import { ContextLevel } from '@/core/constants';
import { CoreSharedModule } from '@/core/shared.module';
import { toBoolean } from '@/core/transforms/boolean';
import { Component, input } from '@angular/core';

/**
 * Component to display the description of a module.
 *
 * This directive is meant to display a module description in a similar way throughout all the app.
 *
 * You can add a note at the right side of the description by using the 'note' attribute.
 *
 * You can also pass a component and componentId to be used in format-text.
 *
 * Module descriptions are shortened by default, allowing the user to see the full description by clicking in it.
 * If you want the whole description to be shown you can use the 'showFull' attribute.
 *
 * Example usage:
 *
 * <core-course-module-description [description]="myDescription"></core-course-module-description>
 *
 * @deprecated since 4.0 use core-course-module-info instead.
 * Keeping this a bit more to avoid plugins breaking.
 */
@Component({
    selector: 'core-course-module-description',
    templateUrl: 'core-course-module-description.html',
    imports: [
        CoreSharedModule,
    ],
    host: {
        '[class.deprecated]': 'true',
    },
})
export class CoreCourseModuleDescriptionComponent {

    readonly description = input<string>(); // The description to display.
    readonly note = input<string>(); // A note to display along with the description.
    readonly component = input<string>(); // Component for format text directive.
    readonly componentId = input<string | number>(); // Component ID to use in conjunction with the component.
    readonly showFull = input(false, { transform: toBoolean }); // Whether to always display the full description.
    readonly contextLevel = input<ContextLevel>(); // The context level.
    readonly contextInstanceId = input<number>(); // The instance ID related to the context.
    readonly courseId = input<number>(); // Course ID the text belongs to. It can be used to improve performance with filters.

}
