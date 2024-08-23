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

import {
    ActionSheetController,
    AlertController,
    LoadingController,
    ModalController,
    PopoverController,
    ToastController,
} from '@singletons';

/**
 * Temporary fix to remove aria-hidden from ion-router-outlet if needed. It can be removed once the Ionic bug is fixed.
 * https://github.com/ionic-team/ionic-framework/issues/29396
 *
 * !!! Only for internal use, this function will be removed without deprecation !!!
 *
 * @param overlay Overlay dismissed.
 */
export async function fixOverlayAriaHidden(
    overlay: HTMLIonModalElement | HTMLIonPopoverElement | HTMLIonAlertElement | HTMLIonToastElement,
): Promise<void> {

    await overlay.onDidDismiss();

    const overlays = await Promise.all([
        ModalController.getTop(),
        PopoverController.getTop(),
        ActionSheetController.getTop(),
        AlertController.getTop(),
        LoadingController.getTop(),
        ToastController.getTop(),
    ]);

    if (!overlays.find(overlay => overlay !== undefined)) {
        document.body.querySelector('ion-router-outlet')?.removeAttribute('aria-hidden');
    }
}
