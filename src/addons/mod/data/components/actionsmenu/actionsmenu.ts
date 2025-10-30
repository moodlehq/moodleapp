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

import { CoreSharedModule } from '@/core/shared.module';
import { Component, Input } from '@angular/core';
import { PopoverController } from '@singletons';

/**
 * Component that displays the actionsmenu.
 */
@Component({
    selector: 'addon-mod-data-actionsmenu',
    templateUrl: 'actionsmenu.html',
    imports: [
        CoreSharedModule,
    ],
})
export class AddonModDataActionsMenuComponent  {

    @Input() items: AddonModDataActionsMenuItem[] = [];

    /**
     * Execute item action and dismiss the popover.
     *
     * @param item item from which the action will be executed.
     */
    async onItemClick(item: AddonModDataActionsMenuItem): Promise<void> {
        item.action();
        await PopoverController.dismiss();
    }

}

export type AddonModDataActionsMenuItem = {
    text: string;
    icon: string;
    action: () => void;
};
