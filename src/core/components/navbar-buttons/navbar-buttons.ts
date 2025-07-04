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

import { Component, Input, OnInit, OnDestroy, ElementRef, ViewContainerRef, ViewChild, inject } from '@angular/core';
import { CoreLogger } from '@singletons/logger';
import { CoreContextMenuComponent } from '../context-menu/context-menu';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CoreDom } from '@singletons/dom';

const BUTTON_HIDDEN_CLASS = 'core-navbar-button-hidden';

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
 * IMPORTANT: Do not use *ngIf in the buttons inside this component, it can cause problems. Please use [class.hidden] instead.
 *
 * Example usage:
 *
 * <core-navbar-buttons slot="end">
 *     <ion-button [class.hidden]="!buttonShown" [ariaLabel]="Do something" (click)="action()">
 *         <ion-icon name="funnel" slot="icon-only" aria-hidden="true"></ion-icon>
 *     </ion-button>
 * </core-navbar-buttons>
 */
@Component({
    selector: 'core-navbar-buttons',
    template: '<ng-content/><template #contextMenuContainer>-</template>',
    styleUrl: 'navbar-buttons.scss',
})
export class CoreNavBarButtonsComponent implements OnInit, OnDestroy {

    @ViewChild('contextMenuContainer', { read: ViewContainerRef }) container!: ViewContainerRef;

    // If the hidden input is true, hide all buttons.
    // eslint-disable-next-line @angular-eslint/no-input-rename
    @Input('hidden') set hidden(value: boolean) {
        if (typeof value === 'string' && value === '') {
            value = true;
        }
        this.allButtonsHidden = value;
        this.showHideAllElements();
    }

    protected element: HTMLElement = inject(ElementRef).nativeElement;
    protected allButtonsHidden = false;
    protected forceHidden = false;
    protected logger: CoreLogger;
    protected movedChildren?: Node[];
    protected mergedContextMenu?: CoreContextMenuComponent;
    protected createdMainContextMenuElement?: HTMLElement;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreNavBarButtonsComponent');

        CoreDirectivesRegistry.register(this.element, this);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            const header = await CoreDom.findIonHeaderFromElement(this.element);
            if (header) {
                // Search the right buttons container (start, end or any).
                let selector = 'ion-buttons';

                let slot = this.element.getAttribute('slot');
                // Take the slot from the parent if it has.
                if (!slot && this.element.parentElement) {
                    slot = this.element.parentElement.getAttribute('slot');
                }
                if (slot) {
                    selector += `[slot="${slot}"]`;
                }

                const buttonsContainer = header.querySelector<HTMLIonButtonsElement>(selector);
                if (buttonsContainer) {
                    this.mergeContextMenus(buttonsContainer);

                    const prepend = this.element.hasAttribute('prepend');

                    this.movedChildren = CoreDom.moveChildren(this.element, buttonsContainer, prepend);
                    this.showHideAllElements();

                    // Make sure that context-menu is always at the end of buttons if any.
                    const contextMenu = buttonsContainer.querySelector('core-context-menu');
                    const userMenu = buttonsContainer.querySelector('core-user-menu-button');

                    if (userMenu) {
                        contextMenu?.parentElement?.insertBefore(contextMenu, userMenu);
                    } else {
                        contextMenu?.parentElement?.appendChild(contextMenu);
                    }
                } else {
                    this.logger.warn('The header was found, but it didn\'t have the right ion-buttons.', selector);
                }
            }
        } catch (error) {
            // Header not found.
            this.logger.error(error);
        }
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
    protected mergeContextMenus(buttonsContainer: HTMLIonButtonsElement): void {
        // Check if both button containers have a context menu.
        const secondaryContextMenu = this.element.querySelector('core-context-menu');
        if (!secondaryContextMenu) {
            return;
        }

        const mainContextMenu = buttonsContainer.querySelector('core-context-menu');
        const secondaryContextMenuInstance = CoreDirectivesRegistry.resolve(secondaryContextMenu, CoreContextMenuComponent);
        let mainContextMenuInstance: CoreContextMenuComponent | null;
        if (mainContextMenu) {
            // Both containers have a context menu. Merge them to prevent having 2 menus at the same time.
            mainContextMenuInstance = CoreDirectivesRegistry.resolve(mainContextMenu, CoreContextMenuComponent);
        } else {
            // There is a context-menu in these buttons, but there is no main context menu in the header.
            // Create one main context menu dynamically.
            // @todo: Find a better way to handle header buttons. This isn't working as expected in some cases because the menu
            // is destroyed when the page is destroyed, so click listeners stop working.
            mainContextMenuInstance = this.createMainContextMenu();
        }

        // Check that both context menus belong to the same core-tab. We shouldn't merge menus from different tabs.
        if (mainContextMenuInstance && secondaryContextMenuInstance) {
            this.mergedContextMenu = secondaryContextMenuInstance;

            this.mergedContextMenu.mergeContextMenus(mainContextMenuInstance);

            // Remove the empty context menu from the DOM.
            secondaryContextMenu.parentElement?.removeChild(secondaryContextMenu);
        }
    }

    /**
     * Create a new and empty context menu to be used as a "parent".
     *
     * @returns Created component.
     */
    protected createMainContextMenu(): CoreContextMenuComponent {
        const componentRef = this.container.createComponent(CoreContextMenuComponent);

        this.createdMainContextMenuElement = componentRef.location.nativeElement;

        return componentRef.instance;
    }

    /**
     * Show or hide all the elements.
     */
    protected showHideAllElements(): void {
        // Show or hide all moved children.
        this.movedChildren?.forEach((child: Node) => {
            this.showHideElement(child);
        });

        // Show or hide all the context menu items that were merged to another context menu.
        if (this.mergedContextMenu) {
            if (this.forceHidden || this.allButtonsHidden) {
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
        // Check if it's an HTML Element and it's not a created context menu. Never hide created context menus.
        if (element instanceof Element && element !== this.createdMainContextMenuElement) {
            element.classList.toggle(BUTTON_HIDDEN_CLASS, !!this.forceHidden || !!this.allButtonsHidden);
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        // This component was destroyed, remove all the buttons that were moved.
        // The buttons can be moved outside of the current page, that's why we need to manually destroy them.
        // There's no need to destroy context menu items that were merged because they weren't moved from their DOM position.
        this.movedChildren?.forEach((child) => {
            if (child.parentElement && child !== this.createdMainContextMenuElement) {
                child.parentElement.removeChild(child);
            }
        });

        this.mergedContextMenu?.removeMergedItems();
    }

}
