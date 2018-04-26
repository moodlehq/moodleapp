// (C) Copyright 2015 Martin Dougiamas
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
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 * Directive to auto focus an element when a view is loaded.
 *
 * You can apply it conditionallity assigning it a boolean value: <ion-input [core-auto-focus]="{{showKeyboard}}">
 */
@Directive({
    selector: '[core-auto-focus]'
})
export class CoreAutoFocusDirective implements OnInit {
    @Input('core-auto-focus') coreAutoFocus: boolean | string = true;

    protected element: HTMLElement;

    constructor(element: ElementRef, private domUtils: CoreDomUtilsProvider, private utils: CoreUtilsProvider,
            @Optional() private navCtrl: NavController) {
        this.element = element.nativeElement || element;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (this.navCtrl.isTransitioning()) {
            // Navigating to a new page. Wait for the transition to be over.
            const subscription = this.navCtrl.viewDidEnter.subscribe(() => {
                this.autoFocus();
                subscription.unsubscribe();
            });
        } else {
            this.autoFocus();
        }
    }

    /**
     * Function after the view is initialized.
     */
    protected autoFocus(): void {
        const autoFocus = this.utils.isTrueOrOne(this.coreAutoFocus);
        if (autoFocus) {
            // Wait a bit to make sure the view is loaded.
            setTimeout(() => {
                // If it's a ion-input or ion-textarea, search the right input to use.
                let element = this.element;
                if (this.element.tagName == 'ION-INPUT') {
                    element = this.element.querySelector('input') || element;
                } else if (this.element.tagName == 'ION-TEXTAREA') {
                    element = this.element.querySelector('textarea') || element;
                }

                this.domUtils.focusElement(element);
            }, 200);
        }
    }
}
