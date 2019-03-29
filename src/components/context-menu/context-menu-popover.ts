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

import { Component } from '@angular/core';
import { NavParams, ViewController } from 'ionic-angular';
import { CoreContextMenuItemComponent } from './context-menu-item';
import { CoreLoggerProvider } from '@providers/logger';

/**
 * Component to display a list of items received by param in a popover.
 */
@Component({
    selector: 'core-context-menu-popover',
    templateUrl: 'core-context-menu-popover.html'
})
export class CoreContextMenuPopoverComponent {
    title: string;
    uniqueId: string;
    items: CoreContextMenuItemComponent[];
    protected logger: any;

    constructor(navParams: NavParams, private viewCtrl: ViewController, logger: CoreLoggerProvider) {
        this.title = navParams.get('title');
        this.items = navParams.get('items') || [];
        this.uniqueId = navParams.get('id');
        this.logger = logger.getInstance('CoreContextMenuPopoverComponent');
    }

    /**
     * Close the popover.
     */
    closeMenu(): void {
        this.viewCtrl.dismiss();
    }

    /**
     * Function called when an item is clicked.
     *
     * @param {Event} event Click event.
     * @param {CoreContextMenuItemComponent} item Item clicked.
     * @return {boolean} Return true if success, false if error.
     */
    itemClicked(event: Event, item: CoreContextMenuItemComponent): boolean {
        if (item.action.observers.length > 0) {
            event.preventDefault();
            event.stopPropagation();

            if (item.iconAction == 'spinner') {
                return false;
            }

            if (item.closeOnClick) {
                this.closeMenu();
            }

            item.action.emit(this.closeMenu.bind(this));
        } else if (item.href && item.closeOnClick) {
            this.closeMenu();
        }

        return true;
    }
}
