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

import { Component, Output, OnInit, OnDestroy, EventEmitter, effect, input, model, computed, inject } from '@angular/core';
import { CoreContextMenuComponent } from '../context-menu/context-menu';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreUtils } from '@singletons/utils';

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
export class CoreContextMenuItemComponent implements OnInit, OnDestroy {

    readonly content = input<string>(); // Content of the item.
    readonly iconAction = input<string>(); // Icon to show on the right side of the item. Represents the action to do on click.
    // If is "spinner" an spinner will be shown.
    // If is "toggle" a toggle switch will be shown.
    // If no icon or spinner is selected, no action or link will work.
    // If href but no iconAction is provided arrow-right will be used.
    readonly iconSlash = input(false, { transform: toBoolean }); // Display a red slash over the icon.
    readonly ariaAction = input<string>(); // Aria label to add to iconAction. If not set, it will be equal to content.
    readonly href = input<string>(); // Link to go if no action provided.
    readonly captureLink = input(false, { transform: toBoolean }); // Whether the link needs to be captured by the app.
    readonly autoLogin = input(true, { transform: toBoolean }); // Whether the link needs to be opened using auto-login.
    readonly closeOnClick = input(true, { transform: toBoolean }); // Whether to close the popover when the item is clicked.
    readonly priority = input<number>(1); // Used to sort items. The highest priority, the highest position.
    readonly badge = input<string>(); // A badge to show in the item.
    readonly badgeClass = input<number>(); // A class to set in the badge.
    readonly badgeA11yText = input<string>(); // Description for the badge, if needed.
    readonly hidden = input(false, { transform: toBoolean }); // Whether the item should be hidden.
    readonly showBrowserWarning = input(true, { transform: toBoolean }); // Show a warning before opening links in browser.
    readonly toggle = model(false); // Whether the toggle is on or off.

    // New output syntax doesn't have the 'observed' property, keep EventEmitter for now.
    // See https://github.com/angular/angular/issues/54837
    @Output() action = new EventEmitter<() => void>(); // Will emit an event when the item clicked.
    @Output() onClosed = new EventEmitter<() => void>(); // Will emit an event when the popover is closed because item was clicked.
    @Output() toggleChange = new EventEmitter<boolean>(); // Will emit an event when toggle changes to enable 2-way data binding.

    uniqueId = CoreUtils.getUniqueId('CoreContextMenuItem');
    // Effective href to use when the item is clicked. Use this instead of href directly.
    readonly effectiveHref = computed(() => this.action.observed ? undefined : this.href());

    protected previousHiddenValue: boolean | undefined; // Previous value of hidden, used to detect if it's the first change.
    protected destroyed = false;
    protected ctxtMenu = inject(CoreContextMenuComponent);

    constructor() {
        effect(() => {
            if (this.previousHiddenValue !== undefined) {
                // Not the first execution, notify that items have changed.
                this.ctxtMenu.itemHiddenChanged();
            }

            this.previousHiddenValue = this.hidden();
        });
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        if (!this.destroyed) {
            this.ctxtMenu.addItem(this);
        }
    }

    /**
     * Toggle changed.
     *
     * @param event Event.
     */
    toggleChanged(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.toggleChange.emit(this.toggle());
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.destroyed = true;
        this.ctxtMenu.removeItem(this);
    }

}
