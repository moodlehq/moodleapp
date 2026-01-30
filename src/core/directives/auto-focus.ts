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

import { Directive, ElementRef, AfterViewInit, inject, input } from '@angular/core';

import { CoreDom } from '@static/dom';
import { CoreWait } from '@static/wait';
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

    readonly autoFocus = input(true, { alias: 'core-auto-focus', transform: toBoolean });

    protected element: HTMLIonInputElement | HTMLIonTextareaElement | HTMLIonSearchbarElement | HTMLElement
        = inject(ElementRef).nativeElement;

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        if (!this.autoFocus()) {
            return;
        }

        await CoreDom.waitToBeInDOM(this.element as HTMLElement);

        // Wait in case there is an animation to enter the page, otherwise the interaction
        // between the keyboard appearing and the animation causes a visual glitch.
        await CoreWait.wait(540);

        CoreDom.focusElement(this.element);

    }

}
