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
import { CoreDom } from '@singletons/dom';
import { CoreWait } from '@singletons/wait';
import { toBoolean } from '../transforms/boolean';

/**
 * Directive to auto focus an element when a view is loaded.
 *
 * The value of the input will decide if show keyboard when focusing the element (only on Android).
 * In case value is false, the directive is disabled.
 *
 * <ion-input [core-auto-focus]="showKeyboard">
 */
@Directive({
    selector: '[core-auto-focus]',
})
export class CoreAutoFocusDirective implements AfterViewInit {

    @Input({ alias: 'core-auto-focus', transform: toBoolean }) autoFocus = true;

    protected element: HTMLIonInputElement | HTMLIonTextareaElement | HTMLIonSearchbarElement | HTMLElement;

    constructor(element: ElementRef) {
        this.element = element.nativeElement;
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        if (!this.autoFocus) {
            return;
        }

        await CoreDom.waitToBeInDOM(this.element);

        // Wait in case there is an animation to enter the page, otherwise the interaction
        // between the keyboard appearing and the animation causes a visual glitch.
        await CoreWait.wait(540);

        CoreDomUtils.focusElement(this.element);

    }

}
