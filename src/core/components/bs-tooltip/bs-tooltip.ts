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

import { CoreBaseModule } from '@/core/base.module';
import { toBoolean } from '@/core/transforms/boolean';
import { Component, Input } from '@angular/core';
import { CoreFormatTextDirective } from '../../directives/format-text';
import { ContextLevel } from '@/core/constants';

/**
 * Component to display a Bootstrap Tooltip in a popover.
 */
@Component({
    selector: 'core-bs-tooltip',
    templateUrl: 'core-bs-tooltip.html',
    imports: [
        CoreBaseModule,
        CoreFormatTextDirective,
    ],
})
export class CoreBSTooltipComponent {

    @Input() title?: string;
    @Input() content = '';
    @Input() formatTextOptions?: CoreFormatTextOptions;
    @Input({ transform: toBoolean }) html = false;

}

/**
 * Options that can be passed to format text.
 */
export type CoreFormatTextOptions = {
    siteId?: string; // Site ID to use.
    component?: string; // Component for CoreExternalContentDirective.
    componentId?: string | number; // Component ID to use in conjunction with the component.
    contextLevel?: ContextLevel; // The context level of the text.
    contextInstanceId?: number; // The instance ID related to the context.
    courseId?: number; // Course ID the text belongs to. It can be used to improve performance with filters.
};
