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

import { Directive, OnInit, ElementRef, inject, input } from '@angular/core';
import { CoreNavigator } from '@services/navigator';

/**
 * Directive to go to user profile on click.
 */
@Directive({
    selector: '[core-user-link]',
})
export class CoreUserLinkDirective implements OnInit {

    readonly userId = input<number>(); // User id to open the profile.
    readonly courseId = input<number>(); // If set, course id to show the user info related to that course.

    protected element: HTMLElement = inject(ElementRef).nativeElement;

    /**
     * Function executed when the component is initialized.
     */
    ngOnInit(): void {
        this.element.addEventListener('click', (event) => {
            // If the event prevented default action, do nothing.
            const userId = this.userId();
            if (event.defaultPrevented || !userId) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            CoreNavigator.navigateToSitePath('user', {
                params: {
                    userId,
                    courseId: this.courseId(),
                },
            });
        });
    }

}
