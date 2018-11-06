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

import { Directive, AfterViewInit, Input, ElementRef, OnDestroy } from '@angular/core';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 * IMPORTANT: This directive is deprecated because it causes a weird effect (the keyboard closes and opens again).
 * We recommend using core-suppress-events directive for a better user experience.
 *
 * Directive to keep the keyboard open when clicking a certain element (usually a button).
 *
 * @description
 *
 * This directive needs to be applied to an input or textarea. The value of the directive needs to be a selector
 * to identify the element to listen for clicks (usually a button).
 *
 * When that element is clicked, the input that has this directive will keep the focus if it has it already and the keyboard
 * won't be closed.
 *
 * Example usage:
 *
 * <textarea [core-keep-keyboard]="'#mma-messages-send-message-button'"></textarea>
 * <button id="mma-messages-send-message-button">Send</button>
 *
 * Alternatively, this directive can be applied to the button. The value of the directive needs to be a selector to identify
 * the input element. In this case, you need to set [inButton]="true".
 *
 * Example usage:
 *
 * <textarea id="send-message-input"></textarea>
 * <button [core-keep-keyboard]="'#send-message-input'" [inButton]="true">Send</button>
 *
 * @deprecated v3.5.2
 */
@Directive({
    selector: '[core-keep-keyboard]'
})
export class CoreKeepKeyboardDirective implements AfterViewInit, OnDestroy {
    @Input('core-keep-keyboard') selector: string; // Selector to identify the button or input.
    @Input() inButton?: boolean | string; // Whether this directive is applied to the button (true) or to the input (false).

    protected element: HTMLElement; // Current element.
    protected button: HTMLElement; // Button element.
    protected input: HTMLElement; // Input element.
    protected lastFocusOut = 0; // Last time the input was focused out.
    protected clickListener: any; // Listener for clicks in the button.
    protected focusOutListener: any; // Listener for focusout in the input.
    protected focusAgainListener: any; // Another listener for focusout, with the purpose to focus again.
    protected stopFocusAgainTimeout: any; // Timeout to stop focus again listener.

    constructor(element: ElementRef, private domUtils: CoreDomUtilsProvider, private utils: CoreUtilsProvider) {
        this.element = element.nativeElement;
    }

    /**
     * View has been initialized.
     */
    ngAfterViewInit(): void {
        // Use a setTimeout because to make sure that child components have been treated.
        setTimeout(() => {
            const inButton = this.utils.isTrueOrOne(this.inButton);
            let candidateEls,
                selectedEl;

            if (typeof this.selector != 'string' || !this.selector) {
                // Not a valid selector, stop.
                return;
            }

            // Get the selected element. Get the last one found.
            candidateEls = document.querySelectorAll(this.selector);
            selectedEl = candidateEls[candidateEls.length - 1];
            if (!selectedEl) {
                // Element not found.
                return;
            }

            if (inButton) {
                // The directive is applied to the button.
                this.button = this.element;
                this.input = selectedEl;
            } else {
                // The directive is applied to the input.
                this.button = selectedEl;

                if (this.element.tagName == 'ION-INPUT') {
                    // Search the inner input.
                    this.input = this.element.querySelector('input');
                } else if (this.element.tagName == 'ION-TEXTAREA') {
                    // Search the inner textarea.
                    this.input = this.element.querySelector('textarea');
                } else {
                    this.input = this.element;
                }

                if (!this.input) {
                    // Input not found, stop.
                    return;
                }
            }

            // Listen for focusout event. This is to be able to check if previous focus was on this element.
            this.focusOutListener = this.focusOut.bind(this);
            this.input.addEventListener('focusout', this.focusOutListener);

            // Listen for clicks in the button.
            this.clickListener = this.buttonClicked.bind(this);
            this.button.addEventListener('click', this.clickListener);
        });
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        if (this.button && this.clickListener) {
            this.button.removeEventListener('click', this.clickListener);
        }
        if (this.input && this.focusOutListener) {
            this.input.removeEventListener('focusout', this.focusOutListener);
        }
    }

    /**
     * The button we're interested in was clicked.
     */
    protected buttonClicked(): void {
        if (document.activeElement == this.input) {
            // Directive's element is focused at the time the button is clicked. Listen for focusout to focus it again.
            this.focusAgainListener = this.focusElementAgain.bind(this);
            this.input.addEventListener('focusout', this.focusAgainListener);
        } else if (document.activeElement == this.button && Date.now() - this.lastFocusOut < 200) {
            // Last focused element was the directive's element, focus it again.
            setTimeout(this.focusElementAgain.bind(this), 0);
        }
    }

    /**
     * If keyboard is open, focus the input again and stop listening focusout to focus again if needed.
     */
    protected focusElementAgain(): void {
        this.domUtils.focusElement(this.input);

        if (this.focusAgainListener) {
            // Sometimes we can receive more than 1 focus out event.
            // If we spend 1 second without receiving any, stop listening for them.
            const listener = this.focusAgainListener; // Store it in a local variable, in case it changes.
            clearTimeout(this.stopFocusAgainTimeout);
            this.stopFocusAgainTimeout = setTimeout(() => {
                this.input.removeEventListener('focusout', listener);
                if (listener == this.focusAgainListener) {
                    delete this.focusAgainListener;
                }
            }, 1000);
        }
    }

    /**
     * Input was focused out, save the time it was done.
     */
    protected focusOut(): void {
        this.lastFocusOut = Date.now();
    }
}
