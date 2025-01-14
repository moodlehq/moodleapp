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
import { AlertButton, AlertOptions } from '@ionic/angular';
import { TextFieldTypes } from '@ionic/core';
import { CoreAlerts } from './alerts';
import { makeSingleton, Translate } from '@singletons';
import { CorePasswordModalParams, CorePasswordModalResponse } from '@components/password-modal/password-modal';
import { CoreModals } from './modals';
import { CoreCanceledError } from '@classes/errors/cancelederror';
import { CoreWSError } from '@classes/errors/wserror';

/**
 * Helper service to display prompts (modals where the user enters data).
 */
@Injectable({ providedIn: 'root' })
export class CorePromptsService {

    /**
     * Show a prompt modal to input some data.
     *
     * @param message Modal message.
     * @param type Type of prompt.
     * @param options Other alert options.
     * @returns Promise resolved with the input data (true for checkbox/radio) if the user clicks OK, rejected if cancels.
     */
    show(message: string, type: 'checkbox'|'radio', options?: CoreAlertsShowPromptOptions): Promise<boolean>;
    show(message: string, type: CoreAlertsPromptType, options?: CoreAlertsShowPromptOptions): Promise<string>;
    show(message: string, type: CoreAlertsPromptType, options: CoreAlertsShowPromptOptions = {}): Promise<boolean|string> {
        return new Promise((resolve, reject) => {
            const { placeholderOrLabel, buttons, ...alertOptions } = options;

            const isCheckbox = type === 'checkbox';
            const isRadio = type === 'radio';

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const resolvePromise = (data: any) => {
                if (isCheckbox) {
                    resolve(data[0]);
                } else if (isRadio) {
                    resolve(data);
                } else {
                    resolve(data.promptinput);
                }
            };

            (<AlertOptions> alertOptions).message = message;
            alertOptions.inputs = [
                {
                    name: 'promptinput',
                    placeholder: placeholderOrLabel ?? Translate.instant('core.login.password'),
                    label: placeholderOrLabel ?? Translate.instant('core.login.password'),
                    type,
                    value: (isCheckbox || isRadio) ? true : undefined,
                },
            ];

            if (Array.isArray(buttons) && buttons.length) {
                (<AlertOptions> alertOptions).buttons = buttons.map((button) => ({
                    ...button,
                    handler: (data) => {
                        if (!button.handler) {
                            if (button.role === 'cancel') {
                                reject(new CoreCanceledError());
                            } else {
                                resolvePromise(data);
                            }

                            return;
                        }

                        button.handler(data, resolve, reject);
                    },
                }));
            } else {
                // Default buttons.
                (<AlertOptions> alertOptions).buttons = [
                    {
                        text: buttons && 'cancelText' in buttons
                            ? buttons.cancelText as string
                            : Translate.instant('core.cancel'),
                        role: 'cancel',
                        handler: () => {
                            reject(new CoreCanceledError());
                        },
                    },
                    {
                        text: buttons && 'okText' in buttons
                            ? buttons.okText as string
                            : Translate.instant('core.ok'),
                        handler: resolvePromise,
                    },
                ];
            }

            CoreAlerts.show(alertOptions);
        });
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

export const CorePrompts = makeSingleton(CorePromptsService);

/**
 * Buttons for prompt alert.
 */
export type PromptButton = Omit<AlertButton, 'handler'> & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler?: (value: any, resolve: (value: any) => void, reject: (reason: any) => void) => void;
};

/**
 * Types of prompts.
 */
export type CoreAlertsPromptType = TextFieldTypes | 'checkbox' | 'radio' | 'textarea';

/**
 * Options to pass to CoreAlerts.showPrompt.
 */
export type CoreAlertsShowPromptOptions = Omit<AlertOptions, 'message'|'buttons'> & {
    placeholderOrLabel?: string; // Placeholder (for textual/numeric inputs) or label (for radio/checkbox). By default, "Password".
    buttons?: PromptButton[] | { okText?: string; cancelText?: string }; // Buttons. If not provided or it's an object with texts,
                                                                         // OK and Cancel buttons will be displayed.
};
