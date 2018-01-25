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

import { Component, Input, OnInit, ContentChildren, ElementRef, QueryList } from '@angular/core';
import { Button } from 'ionic-angular';
import { CoreDomUtilsProvider } from '../../providers/utils/dom';

/**
 * Component to add buttons to the app's header without having to place them inside the header itself. This is meant for
 * pages that are loaded inside a sub ion-nav, so they don't have a header.
 *
 * If this component indicates a position (start/end), the buttons will only be added if the header has some buttons in that
 * position. If no start/end is specified, then the buttons will be added to the first <ion-buttons> found in the header.
 *
 * You can use the [hidden] input to hide all the inner buttons if a certain condition is met.
 *
 * Example usage:
 *
 * <core-navbar-buttons end>
 *     <button ion-button icon-only *ngIf="buttonShown" [attr.aria-label]="Do something" (click)="action()">
 *         <ion-icon name="funnel"></ion-icon>
 *     </button>
 * </core-navbar-buttons>
 */
@Component({
    selector: 'core-navbar-buttons',
    template: '<ng-content></ng-content>'
})
export class CoreNavBarButtonsComponent implements OnInit {

    protected BUTTON_HIDDEN_CLASS = 'core-navbar-button-hidden';

    // If the hidden input is true, hide all buttons.
    @Input('hidden') set hidden(value: boolean) {
        this._hidden = value;
        if (this._buttons) {
            this._buttons.forEach((button: Button) => {
                this.showHideButton(button);
            });
        }
    }

    // Get all the buttons inside this directive.
    @ContentChildren(Button) set buttons(buttons: QueryList<Button>) {
        this._buttons = buttons;
        buttons.forEach((button: Button) => {
            button.setRole('bar-button');
            this.showHideButton(button);
        });
    }

    protected element: HTMLElement;
    protected _buttons: QueryList<Button>;
    protected _hidden: boolean;

    constructor(element: ElementRef, private domUtils: CoreDomUtilsProvider) {
        this.element = element.nativeElement;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        const header = this.searchHeader();

        if (header) {
            // Search the right buttons container (start, end or any).
            let selector = 'ion-buttons',
                buttonsContainer: HTMLElement;

            if (this.element.hasAttribute('start')) {
                selector += '[start]';
            } else if (this.element.hasAttribute('end')) {
                selector += '[end]';
            }

            buttonsContainer = header.querySelector(selector);
            if (buttonsContainer) {
                this.domUtils.moveChildren(this.element, buttonsContainer);
            }
        }
    }

    /**
     * Search the ion-header where the buttons should be added.
     *
     * @return {HTMLElement} Header element.
     */
    protected searchHeader(): HTMLElement {
        let parentPage: HTMLElement = this.element;

        while (parentPage) {
            if (!parentPage.parentElement) {
                // No parent, stop.
                break;
            }

            // Get the next parent page.
            parentPage = <HTMLElement> this.domUtils.closest(parentPage.parentElement, '.ion-page');
            if (parentPage) {
                // Check if the page has a header. If it doesn't, search the next parent page.
                const header = this.searchHeaderInPage(parentPage);
                if (header) {
                    return header;
                }
            }
        }
    }

    /**
     * Search ion-header inside a page. The header should be a direct child.
     *
     * @param  {HTMLElement} page Page to search in.
     * @return {HTMLElement} Header element. Undefined if not found.
     */
    protected searchHeaderInPage(page: HTMLElement): HTMLElement {
        for (let i = 0; i < page.children.length; i++) {
            const child = page.children[i];
            if (child.tagName == 'ION-HEADER') {
                return <HTMLElement> child;
            }
        }
    }

    /**
     * Show or hide a button.
     *
     * @param {Button} button Button to show or hide.
     */
    protected showHideButton(button: Button): void {
        if (this._hidden) {
            button.getNativeElement().classList.add(this.BUTTON_HIDDEN_CLASS);
        } else {
            button.getNativeElement().classList.remove(this.BUTTON_HIDDEN_CLASS);
        }
    }
}
