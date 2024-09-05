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
import { NavigationStart } from '@angular/router';
import { CoreModalComponent } from '@classes/modal-component';
import { CoreModalLateralTransitionEnter, CoreModalLateralTransitionLeave } from '@classes/modal-lateral-transition';
import { CoreSheetModalComponent } from '@components/sheet-modal/sheet-modal';
import { AngularFrameworkDelegate, makeSingleton, ModalController, Router } from '@singletons';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { Subscription, filter } from 'rxjs';
import { Md5 } from 'ts-md5';
import { fixOverlayAriaHidden } from '../utils/fix-aria-hidden';
import { ModalOptions } from '@ionic/angular';
import { CoreCanceledError } from '@classes/errors/cancelederror';
import { CoreWSError } from '@classes/errors/wserror';
import { CorePasswordModalResponse, CorePasswordModalParams } from '@components/password-modal/password-modal';

/**
 * Handles application modals.
 */
@Injectable({ providedIn: 'root' })
export class CoreModalsService {

    protected displayedModals: Record<string, HTMLIonModalElement> = {}; // To prevent duplicated modals.

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

        const overlays = document.body.querySelectorAll<HTMLElement>(
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

    /**
     * Opens a Modal.
     *
     * @param options Modal Options.
     * @returns The modal data when the modal closes.
     */
    async openModal<T = unknown>(
        options: OpenModalOptions,
    ): Promise<T | undefined> {
        const { waitForDismissCompleted, closeOnNavigate, ...modalOptions } = options;
        const listenCloseEvents = closeOnNavigate ?? true; // Default to true.

        // TODO: Improve this if we need two modals with same component open at the same time.
        const modalId = Md5.hashAsciiStr(options.component?.toString() || '');
        const alreadyDisplayed = !!this.displayedModals[modalId];

        const modal = alreadyDisplayed
            ? this.displayedModals[modalId]
            : await ModalController.create(modalOptions);

        let navSubscription: Subscription | undefined;

        // Get the promise before presenting to get result if modal is suddenly hidden.
        const resultPromise = waitForDismissCompleted ? modal.onDidDismiss<T>() : modal.onWillDismiss<T>();

        if (!this.displayedModals[modalId]) {
            // Store the modal and remove it when dismissed.
            this.displayedModals[modalId] = modal;

            if (listenCloseEvents) {
                // Listen navigation events to close modals.
                navSubscription = Router.events
                    .pipe(filter(event => event instanceof NavigationStart))
                    .subscribe(async () => {
                        modal.dismiss();
                    });
            }

            await modal.present();
        }

        if (!alreadyDisplayed) {
            fixOverlayAriaHidden(modal);
        }

        const result = await resultPromise;

        navSubscription?.unsubscribe();
        delete this.displayedModals[modalId];

        if (result?.data) {
            return result?.data;
        }
    }

    /**
     * Opens a side Modal.
     *
     * @param options Modal Options.
     * @returns The modal data when the modal closes.
     */
    async openSideModal<T = unknown>(
        options: OpenModalOptions,
    ): Promise<T | undefined> {

        options = Object.assign({
            cssClass: 'core-modal-lateral',
            showBackdrop: true,
            backdropDismiss: true,
            enterAnimation: CoreModalLateralTransitionEnter,
            leaveAnimation: CoreModalLateralTransitionLeave,
        }, options);

        return this.openModal<T>(options);
    }

    /**
     * Prompts password to the user and returns the entered text.
     *
     * @param passwordParams Params to show the modal.
     * @returns Entered password, error and validation.
     */
    async promptPassword<T extends CorePasswordModalResponse>(passwordParams?: CorePasswordModalParams): Promise<T> {
        const { CorePasswordModalComponent } =
            await import('@/core/components/password-modal/password-modal.module');

        const modalData = await CoreModals.openModal<T>(
            {
                cssClass: 'core-password-modal',
                showBackdrop: true,
                backdropDismiss: true,
                component: CorePasswordModalComponent,
                componentProps: passwordParams,
            },
        );

        if (modalData === undefined) {
            throw new CoreCanceledError();
        } else if (modalData instanceof CoreWSError) {
            throw modalData;
        }

        return modalData;
    }

}
export const CoreModals = makeSingleton(CoreModalsService);

/**
 * Options for the openModal function.
 */
export type OpenModalOptions = ModalOptions & {
    waitForDismissCompleted?: boolean;
    closeOnNavigate?: boolean; // Default true.
};
