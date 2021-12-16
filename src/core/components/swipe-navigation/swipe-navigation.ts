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

import { Component, Input } from '@angular/core';
import { CoreSwipeNavigationItemsManager } from '@classes/items-management/swipe-navigation-items-manager';
import { CoreScreen } from '@services/screen';

@Component({
    selector: 'core-swipe-navigation',
    templateUrl: 'swipe-navigation.html',
    styleUrls: ['swipe-navigation.scss'],
})
export class CoreSwipeNavigationComponent {

    @Input() manager?: CoreSwipeNavigationItemsManager;

    get enabled(): boolean {
        return CoreScreen.isMobile && !!this.manager;
    }

    /**
     * Swipe to previous item.
     */
    swipeLeft(): void {
        if (!this.enabled) {
            return;
        }

        this.manager?.navigateToPreviousItem();
    }

    /**
     * Swipe to next item.
     */
    swipeRight(): void {
        if (!this.enabled) {
            return;
        }

        this.manager?.navigateToNextItem();
    }

}
