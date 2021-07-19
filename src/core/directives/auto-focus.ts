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

import { Directive, Input, ElementRef, AfterViewInit } from '@angular/core';

import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';

/**
 * Directive to auto focus an element when a view is loaded.
 *
 * The value of the input will decide if show keyboard when focusing the element (only on Android).
 * In case value is nofocus, the directive is disabled.
 *
 * <ion-input [core-auto-focus]="showKeyboard">
 */
@Directive({
    selector: '[core-auto-focus]',
})
export class CoreAutoFocusDirective implements AfterViewInit {

    @Input('core-auto-focus') autoFocus: boolean | string = true;

    protected element: HTMLElement;

    constructor(element: ElementRef) {
        this.element = element.nativeElement;
    }

    /**
     * @inheritdoc
     */
    ngAfterViewInit(): void {
        if (CoreUtils.isFalseOrZero(this.autoFocus)) {
            return;
        }

        this.setFocus();
    }

    /**
     * Function to focus the element.
     *
     * @param retries Internal param to stop retrying then 0.
     */
    protected setFocus(retries = 10): void {
        if (retries == 0) {
            return;
        }

        // Wait a bit to make sure the view is loaded.
        setTimeout(() => {
            // If it's a ion-input or ion-textarea, search the right input to use.
            let element: HTMLElement | null = null;

            if (this.element.tagName == 'ION-INPUT') {
                element = this.element.querySelector('input');
            } else if (this.element.tagName == 'ION-TEXTAREA') {
                element = this.element.querySelector('textarea');
            } else {
                element = this.element;
            }

            if (!element) {
                this.setFocus(retries - 1);

                return;
            }

            CoreDomUtils.focusElement(element);

            if (element != document.activeElement) {
                this.setFocus(retries - 1);

                return;
            }
        }, 200);
    }

}
