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

import { CoreConstants } from '@/core/constants';
import { Injectable } from '@angular/core';
import { ToastOptions } from '@ionic/angular';
import { Translate, ToastController, makeSingleton } from '@singletons';
import { fixOverlayAriaHidden } from '@/core/utils/fix-aria-hidden';

/**
 * Handles application toasts.
 */
@Injectable({ providedIn: 'root' })
export class CoreToastsService {

    /**
     * Displays an autodimissable toast modal window.
     *
     * @param options Options.
     * @returns Promise resolved with Toast instance.
     */
    async show(options: ShowToastOptions): Promise<HTMLIonToastElement> {
        if (options.translateMessage && typeof options.message === 'string') {
            options.message = Translate.instant(options.message);
        }

        options.duration = options.duration ?? ToastDuration.SHORT;

        // Convert some values and set default values.
        const toastOptions: ToastOptions = {
            ...options,
            duration: CoreConstants.CONFIG.toastDurations[options.duration] ?? options.duration ?? 2000,
            position: options.position ?? 'bottom',
        };

        const loader = await ToastController.create(toastOptions);

        await loader.present();

        fixOverlayAriaHidden(loader);

        return loader;
    }

}

export const CoreToasts = makeSingleton(CoreToastsService);

/**
 * Toast duration.
 */
export enum ToastDuration {
    LONG = 'long',
    SHORT = 'short',
    STICKY = 'sticky',
}

/**
 * Options for showToastWithOptions.
 */
export type ShowToastOptions = Omit<ToastOptions, 'duration'> & {
    duration?: ToastDuration | number;
    translateMessage?: boolean;
};
