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

        this.fixPopoverOutsideScreen(popover, options);

        return popover;
    }

    /**
     * Adjust size of the popover in case it's out of the screen. This could be solved in Ionic in the future.
     * The changes will be applied after rendering the popover, so the popover can move after being shown.
     *
     * @param popover The popover element.
     * @param options Popover options.
     */
    protected fixPopoverOutsideScreen(popover: HTMLIonPopoverElement, options: PopoverOptions): void {
        const popoverContent = popover.shadowRoot?.querySelector('.popover-content');
        if (!popoverContent) {
            return;
        }

        const style = getComputedStyle(popoverContent);
        const contentHeight = parseInt(style.height, 10);
        const isTopPopover = options.side === 'top';
        const overflowHeight = isTopPopover ?
            ((parseInt(style.bottom, 10) + contentHeight) - popover.clientHeight) :
            ((parseInt(style.top, 10) + contentHeight) - popover.clientHeight);

        if (overflowHeight <= 1) {
            // No overflow. Add a 1px error margin because Ionic's positioning sometimes causes a 1px overflow, and adding
            // scroll in that case looks weird.
            return;
        }

        const visibleHeight = contentHeight - overflowHeight;
        if (visibleHeight < 250) {
            // The visible height is too small, move the popover to show it fully.
            const offset = isTopPopover ? overflowHeight : -overflowHeight;
            popover.style.setProperty('--offset-y', `${offset}px`);
        } else {
            // Add a max height to allow scrolling inside the popover. Add 4px margin to leave some space with the edge.
            popover.style.setProperty('--max-height', `${visibleHeight - 4}px`);
            if (isTopPopover) {
                popover.style.setProperty('--offset-y', `${Math.abs(contentHeight) + 4}px`);
            }
        }
    }

}
export const CorePopovers = makeSingleton(CorePopoversService);

/**
 * Options for the openPopover function.
 */
export type OpenPopoverOptions = Omit<PopoverOptions, 'showBackdrop'> & {
    waitForDismissCompleted?: boolean;
};
