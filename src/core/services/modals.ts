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

import { Constructor } from '@/core/utils/types';
import { Injectable } from '@angular/core';
import { CoreModalComponent } from '@classes/modal-component';
import { CoreSheetModalComponent } from '@components/sheet-modal/sheet-modal';
import { AngularFrameworkDelegate, makeSingleton } from '@singletons';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';

/**
 * Handles application modals.
 */
@Injectable({ providedIn: 'root' })
export class CoreModalsService {

    /**
     * Get index of the overlay on top of the stack.
     *
     * @returns Z-index of the overlay on top.
     */
    getTopOverlayIndex(): number {
        // This has to be done manually because Ionic's overlay mechanisms are not exposed externally, thus making it more difficult
        // to implement custom overlays.
        //
        // eslint-disable-next-line max-len
        // See https://github.com/ionic-team/ionic-framework/blob/a9b12a5aa4c150a1f8a80a826dda0df350bc0092/core/src/utils/overlays.ts#L39

        const overlays = document.querySelectorAll<HTMLElement>(
            'ion-action-sheet, ion-alert, ion-loading, ion-modal, ion-picker, ion-popover, ion-toast',
        );

        return Array.from(overlays).reduce((maxIndex, element) => {
            const index = parseInt(element.style.zIndex);

            if (isNaN(index)) {
                return maxIndex;
            }

            return Math.max(maxIndex, index % 10000);
        }, 0);
    }

    /**
     * Open a sheet modal component.
     *
     * @param component Component to render inside the modal.
     * @returns Modal result once it's been closed.
     */
    async openSheet<T>(component: Constructor<CoreModalComponent<T>>): Promise<T> {
        const container = document.querySelector('ion-app') ?? document.body;
        const viewContainer = container.querySelector('ion-router-outlet, ion-nav, #ion-view-container-root');
        const element = await AngularFrameworkDelegate.attachViewToDom(
            container,
            CoreSheetModalComponent,
            { component },
        );
        const sheetModal = CoreDirectivesRegistry.require<CoreSheetModalComponent<CoreModalComponent<T>>>(
            element,
            CoreSheetModalComponent,
        );
        const modal = await sheetModal.show();

        viewContainer?.setAttribute('aria-hidden', 'true');

        modal.result.finally(async () => {
            await sheetModal.hide();
            await AngularFrameworkDelegate.removeViewFromDom(container, element);

            viewContainer?.removeAttribute('aria-hidden');
        });

        return modal.result;
    }

}

export const CoreModals = makeSingleton(CoreModalsService);
