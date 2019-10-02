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

import { Directive, Input, OnInit, ElementRef, Optional } from '@angular/core';
import { NavController } from 'ionic-angular';
import { CoreSplitViewComponent } from '@components/split-view/split-view';

/**
 * Directive to go to user profile on click.
 */
@Directive({
    selector: '[core-user-link]'
})
export class CoreUserLinkDirective implements OnInit {
    @Input() userId: number; // User id to open the profile.
    @Input() courseId?: number; // If set, course id to show the user info related to that course.

    protected element: HTMLElement;

    constructor(element: ElementRef,
            @Optional() private navCtrl: NavController,
            @Optional() private svComponent: CoreSplitViewComponent) {

        // This directive can be added dynamically. In that case, the first param is the anchor HTMLElement.
        this.element = element.nativeElement || element;
    }

    /**
     * Function executed when the component is initialized.
     */
    ngOnInit(): void {
        this.element.addEventListener('click', (event) => {
            // If the event prevented default action, do nothing.
            if (!event.defaultPrevented) {
                event.preventDefault();
                event.stopPropagation();

                // Decide which navCtrl to use. If this directive is inside a split view, use the split view's master nav.
                const navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;
                navCtrl.push('CoreUserProfilePage', { userId: this.userId, courseId: this.courseId });
            }
        });
    }
}
