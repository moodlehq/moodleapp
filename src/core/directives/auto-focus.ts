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

import { Directive, Input, OnInit, ElementRef } from '@angular/core';

import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';

/**
 * Directive to auto focus an element when a view is loaded.
 *
 * You can apply it conditionallity assigning it a boolean value: <ion-input [core-auto-focus]="{{showKeyboard}}">
 *
 * @deprecated since 3.9.5. ion-input now supports an [autofocus] attribute, please use that one instead.
 */
@Directive({
    selector: '[core-auto-focus]',
})
export class CoreAutoFocusDirective implements OnInit {

    @Input('core-auto-focus') coreAutoFocus: boolean | string = true;

    protected element: HTMLElement;

    constructor(element: ElementRef) {
        this.element = element.nativeElement;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.autoFocus();
    }

    /**
     * Function after the view is initialized.
     */
    protected autoFocus(): void {
        const autoFocus = CoreUtils.isTrueOrOne(this.coreAutoFocus);
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

                CoreDomUtils.focusElement(element);
            }, 200);
        }
    }

}
