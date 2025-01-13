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
import { CoreIonLoadingElement } from '@classes/ion-loading';
import { Translate, makeSingleton } from '@singletons';
import { CoreAlerts } from './alerts';

/**
 * Handles application loading.
 */
@Injectable({ providedIn: 'root' })
export class CoreLoadingsService {

    protected activeLoadingModals: CoreIonLoadingElement[] = [];

    /**
     * Displays a loading modal window.
     *
     * @param text The text of the modal window. Default: core.loading.
     * @param needsTranslate Whether the 'text' needs to be translated.
     * @returns Loading element instance.
     * @description
     * Usage:
     *     let modal = await CoreLoading.show(myText);
     *     ...
     *     modal.dismiss();
     */
    async show(text?: string, needsTranslate?: boolean): Promise<CoreIonLoadingElement> {
        if (!text) {
            text = Translate.instant('core.loading');
        } else if (needsTranslate) {
            text = Translate.instant(text);
        }

        const loading = new CoreIonLoadingElement(text);

        loading.onDismiss(() => {
            const index = this.activeLoadingModals.indexOf(loading);

            if (index !== -1) {
                this.activeLoadingModals.splice(index, 1);
            }
        });

        this.activeLoadingModals.push(loading);

        await loading.present();

        return loading;
    }

    /**
     * Show a loading modal whilst an operation is running, and an error modal if it fails.
     *
     * @param text Loading dialog text.
     * @param needsTranslate Whether the 'text' needs to be translated.
     * @param operation Operation.
     * @returns Operation result.
     */
    async showOperationModals<T>(text: string, needsTranslate: boolean, operation: () => Promise<T>): Promise<T | null> {
        const modal = await this.show(text, needsTranslate);

        try {
            return await operation();
        } catch (error) {
            CoreAlerts.showError(error);

            return null;
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Pauses the active loading modal.
     */
    async pauseActiveModals(): Promise<void> {
        await Promise.all(this.activeLoadingModals.slice(0).reverse().map(modal => modal.pause()));
    }

    /**
     * Resumes the active loading modals.
     */
    async resumeActiveModals(): Promise<void> {
        await Promise.all(this.activeLoadingModals.map(modal => modal.resume()));
    }

}
export const CoreLoadings = makeSingleton(CoreLoadingsService);
