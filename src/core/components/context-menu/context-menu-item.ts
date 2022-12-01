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

import { Component, Input, Output, OnInit, OnDestroy, EventEmitter, OnChanges, SimpleChange } from '@angular/core';
import { CoreLogger } from '@singletons/logger';
import { CoreContextMenuComponent } from '../context-menu/context-menu';

/**
 * This directive adds a item to the Context Menu popover.
 *
 * @description
 * This directive defines and item to be added to the popover generated in CoreContextMenu.
 *
 * It is required to place this tag inside a core-context-menu tag.
 *
 * <core-context-menu>
 *     <core-context-menu-item [hidden]="showGrid" [priority]="601" [content]="'core.layoutgrid' | translate"
 *         (action)="switchGrid()" [iconAction]="'apps'"></core-context-menu-item>
 * </core-context-menu>
 */
@Component({
    selector: 'core-context-menu-item',
    template: '',
})
export class CoreContextMenuItemComponent implements OnInit, OnDestroy, OnChanges {

    @Input() content?: string; // Content of the item.
    @Input() iconAction?: string; // Name of the icon to show on the right side of the item. Represents the action to do on click.
    // If is "spinner" an spinner will be shown.
    // If is "toggle" a toggle switch will be shown.
    // If no icon or spinner is selected, no action or link will work.
    // If href but no iconAction is provided arrow-right will be used.
    @Input() iconSlash?: boolean; // Display a red slash over the icon.
    @Input() ariaAction?: string; // Aria label to add to iconAction. If not set, it will be equal to content.
    @Input() href?: string; // Link to go if no action provided.
    @Input() captureLink?: boolean | string; // Whether the link needs to be captured by the app.
    @Input() autoLogin: boolean | string = true; // Whether the link needs to be opened using auto-login.
    @Input() closeOnClick = true; // Whether to close the popover when the item is clicked.
    @Input() priority?: number; // Used to sort items. The highest priority, the highest position.
    @Input() badge?: string; // A badge to show in the item.
    @Input() badgeClass?: number; // A class to set in the badge.
    @Input() badgeA11yText?: string; // Description for the badge, if needed.
    @Input() hidden?: boolean; // Whether the item should be hidden.
    @Input() showBrowserWarning = true; // Whether to show a warning before opening browser (for links). Defaults to true.
    @Input() toggle = false; // Whether the toggle is on or off.
    @Output() action?: EventEmitter<() => void>; // Will emit an event when the item clicked.
    @Output() onClosed?: EventEmitter<() => void>; // Will emit an event when the popover is closed because the item was clicked.
    @Output() toggleChange = new EventEmitter<boolean>();// Will emit an event when toggle changes to enable 2-way data binding.

    /**
     * @deprecated since 4.0.
     */
    @Input() iconDescription?: string; // Name of the icon to be shown on the left side of the item. Not used anymore.

    protected hasAction = false;
    protected destroyed = false;

    constructor(
        protected ctxtMenu: CoreContextMenuComponent,
    ) {
        this.action = new EventEmitter();
        this.onClosed = new EventEmitter();
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        // Initialize values.
        this.priority = this.priority || 1;
        this.hasAction = !!this.action && this.action.observers.length > 0;
        this.ariaAction = this.ariaAction || this.content;

        if (this.hasAction) {
            this.href = '';
        }

        // Navigation help if href provided.
        this.captureLink = this.href && this.captureLink ? this.captureLink : false;

        if (!this.destroyed) {
            this.ctxtMenu.addItem(this);
        }

        if (this.iconDescription !== undefined) {
            CoreLogger.getInstance('CoreContextMenuItemComponent')
                .warn('iconDescription Input is deprecated and should not be used');
        }
    }

    /**
     * Toggle changed.
     *
     * @param event Event.
     */
    toggleChanged(event: Event): void {
        if (this.toggle === undefined) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        this.toggleChange.emit(this.toggle);
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.destroyed = true;
        this.ctxtMenu.removeItem(this);
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (changes.hidden && !changes.hidden.firstChange) {
            this.ctxtMenu.itemsChanged();
        }
    }

}
