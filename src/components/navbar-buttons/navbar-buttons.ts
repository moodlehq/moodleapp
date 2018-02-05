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
import { CoreLoggerProvider } from '../../providers/logger';
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
    protected logger: any;

    constructor(element: ElementRef, logger: CoreLoggerProvider, private domUtils: CoreDomUtilsProvider) {
        this.element = element.nativeElement;
        this.logger = logger.getInstance('CoreNavBarButtonsComponent');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.searchHeader().then((header) => {
            if (header) {
                // Search the right buttons container (start, end or any).
                let selector = 'ion-buttons',
                    buttonsContainer: HTMLElement;

                if (this.element.hasAttribute('start')) {
                    selector += '[start]';
                } else if (this.element.hasAttribute('end')) {
                    selector += '[end]';
                }

                buttonsContainer = <HTMLElement> header.querySelector(selector);
                if (buttonsContainer) {
                    this.mergeContextMenus(buttonsContainer);

                    this.domUtils.moveChildren(this.element, buttonsContainer);
                } else {
                    this.logger.warn('The header was found, but it didn\'t have the right ion-buttons.', selector);
                }
            }
        }).catch(() => {
            // Header not found.
            this.logger.warn('Header not found.');
        });
    }

    /**
     * If both button containers have a context menu, merge them into a single one.
     *
     * @param {HTMLElement} buttonsContainer The container where the buttons will be moved.
     */
    protected mergeContextMenus(buttonsContainer: HTMLElement): void {
        // Check if both button containers have a context menu.
        const mainContextMenu = buttonsContainer.querySelector('core-context-menu');
        if (!mainContextMenu) {
            return;
        }

        const secondaryContextMenu = this.element.querySelector('core-context-menu');
        if (!secondaryContextMenu) {
            return;
        }

        // Both containers have a context menu. Merge them to prevent having 2 menus at the same time.
        const mainContextMenuInstance = this.domUtils.getInstanceByElement(mainContextMenu),
            secondaryContextMenuInstance = this.domUtils.getInstanceByElement(secondaryContextMenu);

        if (mainContextMenuInstance && secondaryContextMenuInstance) {
            secondaryContextMenuInstance.mergeContextMenus(mainContextMenuInstance);

            // Remove the empty context menu from the DOM.
            secondaryContextMenu.parentElement.removeChild(secondaryContextMenu);
        }
    }

    /**
     * Search the ion-header where the buttons should be added.
     *
     * @param {number} [retries] Number of retries so far.
     * @return {Promise<HTMLElement>} Promise resolved with the header element.
     */
    protected searchHeader(retries: number = 0): Promise<HTMLElement> {
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
                    return Promise.resolve(header);
                }
            }
        }

        // Header not found.
        if (retries < 5) {
            // If the component or any of its parent is inside a ng-content or similar it can be detached when it's initialized.
            // Try again after a while.
            return new Promise((resolve, reject): void => {
                setTimeout(() => {
                    this.searchHeader(retries + 1).then(resolve, reject);
                }, 200);
            });
        }

        // We've waited enough time, reject.
        return Promise.reject(null);
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
