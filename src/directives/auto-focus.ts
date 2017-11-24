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

import { Directive, Input, AfterViewInit, ElementRef } from '@angular/core';
import { CoreDomUtilsProvider } from '../providers/utils/dom';

/**
 * Directive to auto focus an element when a view is loaded.
 *
 * You can apply it conditionallity assigning it a boolean value: <ion-input [mm-auto-focus]="{{showKeyboard}}">
 */
@Directive({
    selector: '[core-auto-focus]'
})
export class CoreAutoFocusDirective implements AfterViewInit {
    @Input('core-auto-focus') coreAutoFocus: boolean = true;

    protected element: HTMLElement;

    constructor(element: ElementRef, private domUtils: CoreDomUtilsProvider) {
        this.element = element.nativeElement || element;
    }

    /**
     * Function after the view is initialized.
     */
    ngAfterViewInit() {
        this.coreAutoFocus = typeof this.coreAutoFocus != 'boolean' ? true : this.coreAutoFocus;
        if (this.coreAutoFocus) {
            // If it's a ion-input or ion-textarea, search the right input to use.
            let element = this.element;
            if (this.element.tagName == 'ION-INPUT') {
                element = this.element.querySelector('input') || element;
            } else if (this.element.tagName == 'ION-TEXTAREA') {
                element = this.element.querySelector('textarea') || element;
            }

            // Wait a bit to make sure the view is loaded.
            setTimeout(() => {
                this.domUtils.focusElement(element);
            }, 200);
        }
    }
}
