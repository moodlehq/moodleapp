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

import { Injectable } from '@angular/core';
import { makeSingleton, PopoverController } from '@singletons';
import { fixOverlayAriaHidden } from '@/core/utils/fix-aria-hidden';
import { PopoverOptions } from '@ionic/angular';

/**
 * Handles application popovers.
 */
@Injectable({ providedIn: 'root' })
export class CorePopoversService {

   /**
    * Opens a popover and waits for it to be dismissed to return the result.
    *
    * @param options Options.
    * @returns Promise resolved when the popover is dismissed or will be dismissed.
    */
   async open<T = void>(options: OpenPopoverOptions): Promise<T | undefined> {
        const { waitForDismissCompleted, ...popoverOptions } = options;
        const popover = await this.openWithoutResult(popoverOptions);

        const result = waitForDismissCompleted ? await popover.onDidDismiss<T>() : await popover.onWillDismiss<T>();
        if (result?.data) {
            return result?.data;
        }
    }

    /**
     * Opens a popover.
     *
     * @param options Options.
     * @returns Promise resolved when the popover is displayed.
     */
    async openWithoutResult(options: Omit<PopoverOptions, 'showBackdrop'>): Promise<HTMLIonPopoverElement> {
        const popover = await PopoverController.create(options);

        await popover.present();

        fixOverlayAriaHidden(popover);

        return popover;
    }

}
export const CorePopovers = makeSingleton(CorePopoversService);

/**
 * Options for the openPopover function.
 */
export type OpenPopoverOptions = Omit<PopoverOptions, 'showBackdrop'> & {
    waitForDismissCompleted?: boolean;
};
