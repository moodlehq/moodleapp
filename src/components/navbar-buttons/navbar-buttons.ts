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

import { Component, Input, OnInit, OnDestroy, ContentChildren, ElementRef, QueryList } from '@angular/core';
import { Button } from 'ionic-angular';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreContextMenuComponent } from '../context-menu/context-menu';

/**
 * Component to add buttons to the app's header without having to place them inside the header itself. This is meant for
 * pages that are loaded inside a sub ion-nav, so they don't have a header.
 *
 * If this component indicates a position (start/end), the buttons will only be added if the header has some buttons in that
 * position. If no start/end is specified, then the buttons will be added to the first <ion-buttons> found in the header.
 *
 * If this component has a "prepend" attribute, the buttons will be added before other existing buttons in the header.
 *
 * You can use the [hidden] input to hide all the inner buttons if a certain condition is met.
 *
 * IMPORTANT: Do not use *ngIf in the buttons inside this component, it can cause problems. Please use [hidden] instead.
 *
 * Example usage:
 *
 * <core-navbar-buttons end>
 *     <button ion-button icon-only [hidden]="!buttonShown" [attr.aria-label]="Do something" (click)="action()">
 *         <ion-icon name="funnel"></ion-icon>
 *     </button>
 * </core-navbar-buttons>
 */
@Component({
    selector: 'core-navbar-buttons',
    template: '<ng-content></ng-content>'
})
export class CoreNavBarButtonsComponent implements OnInit, OnDestroy {

    protected BUTTON_HIDDEN_CLASS = 'core-navbar-button-hidden';

    // If the hidden input is true, hide all buttons.
    @Input('hidden') set hidden(value: boolean) {
        this._hidden = value;
        this.showHideAllElements();
    }

    // Get all the ion-buttons inside this directive and apply the role bar-button.
    @ContentChildren(Button) set buttons(buttons: QueryList<Button>) {
        buttons.forEach((button: Button) => {
            button.setRole('bar-button');
        });
    }

    protected element: HTMLElement;
    protected _hidden: boolean;
    protected forceHidden = false;
    protected logger: any;
    protected movedChildren: Node[];
    protected instanceId: string;
    protected mergedContextMenu: CoreContextMenuComponent;

    constructor(element: ElementRef, logger: CoreLoggerProvider, private domUtils: CoreDomUtilsProvider) {
        this.element = element.nativeElement;
        this.logger = logger.getInstance('CoreNavBarButtonsComponent');
        this.instanceId = this.domUtils.storeInstanceByElement(this.element, this);
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

                    const prepend = this.element.hasAttribute('prepend');
                    this.movedChildren = this.domUtils.moveChildren(this.element, buttonsContainer, prepend);
                    this.showHideAllElements();

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
     * Force or unforce hiding all buttons. If this is true, it will override the "hidden" input.
     *
     * @param value The value to set.
     */
    forceHide(value: boolean): void {
        this.forceHidden = value;

        this.showHideAllElements();
    }

    /**
     * If both button containers have a context menu, merge them into a single one.
     *
     * @param buttonsContainer The container where the buttons will be moved.
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
        const mainContextMenuInstance: CoreContextMenuComponent = this.domUtils.getInstanceByElement(mainContextMenu),
            secondaryContextMenuInstance: CoreContextMenuComponent = this.domUtils.getInstanceByElement(secondaryContextMenu);

        // Check that both context menus belong to the same core-tab. We shouldn't merge menus from different tabs.
        if (mainContextMenuInstance && secondaryContextMenuInstance &&
                mainContextMenuInstance.coreTab === secondaryContextMenuInstance.coreTab) {
            this.mergedContextMenu = secondaryContextMenuInstance;

            this.mergedContextMenu.mergeContextMenus(mainContextMenuInstance);

            // Remove the empty context menu from the DOM.
            secondaryContextMenu.parentElement.removeChild(secondaryContextMenu);
        }
    }

    /**
     * Search the ion-header where the buttons should be added.
     *
     * @param retries Number of retries so far.
     * @return Promise resolved with the header element.
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
                if (header && getComputedStyle(header, null).display != 'none') {
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
     * @param page Page to search in.
     * @return Header element. Undefined if not found.
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
     * Show or hide all the elements.
     */
    protected showHideAllElements(): void {
        // Show or hide all moved children.
        if (this.movedChildren) {
            this.movedChildren.forEach((child: Node) => {
                this.showHideElement(child);
            });
        }

        // Show or hide all the context menu items that were merged to another context menu.
        if (this.mergedContextMenu) {
            if (this.forceHidden || this._hidden) {
                this.mergedContextMenu.removeMergedItems();
            } else {
                this.mergedContextMenu.restoreMergedItems();
            }
        }
    }

    /**
     * Show or hide an element.
     *
     * @param element Element to show or hide.
     */
    protected showHideElement(element: Node): void {
        // Check if it's an HTML Element
        if (element instanceof Element) {
            if (this.forceHidden || this._hidden) {
                element.classList.add(this.BUTTON_HIDDEN_CLASS);
            } else {
                element.classList.remove(this.BUTTON_HIDDEN_CLASS);
            }
        }
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.domUtils.removeInstanceById(this.instanceId);

        // This component was destroyed, remove all the buttons that were moved.
        // The buttons can be moved outside of the current page, that's why we need to manually destroy them.
        // There's no need to destroy context menu items that were merged because they weren't moved from their DOM position.
        if (this.movedChildren) {
            this.movedChildren.forEach((child) => {
                if (child.parentElement) {
                    child.parentElement.removeChild(child);
                }
            });
        }

        if (this.mergedContextMenu) {
            this.mergedContextMenu.removeMergedItems();
        }
    }
}
