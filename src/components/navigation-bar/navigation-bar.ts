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

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CoreTextUtilsProvider } from '@providers/utils/text';

/**
 * Component to show a "bar" with arrows to navigate forward/backward and a "info" icon to display more data.
 *
 * This directive will show two arrows at the left and right of the screen to navigate to previous/next item when clicked.
 * If no previous/next item is defined, that arrow won't be shown. It will also show a button to show more info.
 *
 * Example usage:
 * <core-navigation-bar [previous]="prevItem" [next]="nextItem" (action)="goTo($event)"></core-navigation-bar>
 */
@Component({
    selector: 'core-navigation-bar',
    templateUrl: 'core-navigation-bar.html',
})
export class CoreNavigationBarComponent {
    @Input() previous?: any; // Previous item. If not defined, the previous arrow won't be shown.
    @Input() previousTitle?: string; // Previous item title. If not defined, only the arrow will be shown.
    @Input() next?: any; // Next item. If not defined, the next arrow won't be shown.
    @Input() nextTitle?: string; // Next item title. If not defined, only the arrow will be shown.
    @Input() info?: string; // Info to show when clicking the info button. If not defined, the info button won't be shown.
    @Input() title?: string; // Title to show when seeing the info (new page).
    @Input() component?: string; // Component the bar belongs to.
    @Input() componentId?: number; // Component ID.
    @Input() contextLevel?: string; // The context level.
    @Input() contextInstanceId?: number; // The instance ID related to the context.
    @Input() courseId?: number; // Course ID the text belongs to. It can be used to improve performance with filters.
    @Output() action?: EventEmitter<any>; // Function to call when an arrow is clicked. Will receive as a param the item to load.

    constructor(private textUtils: CoreTextUtilsProvider) {
        this.action = new EventEmitter<any>();
    }

    showInfo(): void {
        this.textUtils.viewText(this.title, this.info, {
            component: this.component,
            componentId: this.componentId,
            filter: true,
            contextLevel: this.contextLevel,
            instanceId: this.contextInstanceId,
            courseId: this.courseId,
        });
    }
}
