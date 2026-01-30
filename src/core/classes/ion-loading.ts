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

import { CoreWait } from '@static/wait';
import { LoadingController } from '@singletons';
import { CoreToasts } from '@services/overlays/toasts';

/**
 * Dismiss listener.
 */
export type CoreIonLoadingElementDismissListener = () => unknown;

/**
 * Class to improve the behaviour of HTMLIonLoadingElement.
 *
 * In addition to present/dismiss, this loader can also be paused/resumed in order to allow stacking
 * modals in top of one another without interfering. Conceptually, a paused loader is still
 * active but will not be shown in the UI.
 */
export class CoreIonLoadingElement {

    protected scheduled = false;
    protected paused = false;
    protected listeners: CoreIonLoadingElementDismissListener[] = [];
    protected asyncLoadingElement?: Promise<HTMLIonLoadingElement>;

    constructor(protected text?: string) { }

    /**
     * Dismiss the loading element.
     *
     * @param data Dismiss data.
     * @param role Dismiss role.
     */
    async dismiss(data?: unknown, role?: string): Promise<void> {
        if (this.paused) {
            this.paused = false;
            this.listeners.forEach(listener => listener());

            return;
        }

        if (!this.asyncLoadingElement) {
            if (this.scheduled) {
                this.scheduled = false;
                this.listeners.forEach(listener => listener());
            }

            return;
        }

        const asyncLoadingElement = this.asyncLoadingElement;
        delete this.asyncLoadingElement;

        const loadingElement = await asyncLoadingElement;
        await loadingElement.dismiss(data, role);

        this.listeners.forEach(listener => listener());
    }

    /**
     * Dismiss the loading element and present a status message for screen readers.
     *
     * @param text Status message for screen readers.
     * @param needsTranslate Whether the 'text' needs to be translated.
     */
    async dismissWithStatus(text: string, needsTranslate?: boolean): Promise<void> {
        await Promise.all([
            this.dismiss(),
            CoreToasts.show({
               cssClass: 'sr-only',
                message: text,
                translateMessage: needsTranslate,
            }),
        ]);
    }

    /**
     * Register dismiss listener.
     *
     * @param listener Listener.
     */
    onDismiss(listener: CoreIonLoadingElementDismissListener): void {
        this.listeners.push(listener);
    }

    /**
     * Hide the loading element.
     */
    async pause(): Promise<void> {
        if (!this.asyncLoadingElement) {
            return;
        }

        this.paused = true;

        const asyncLoadingElement = this.asyncLoadingElement;
        delete this.asyncLoadingElement;

        const loadingElement = await asyncLoadingElement;
        loadingElement.dismiss();
    }

    /**
     * Present the loading element.
     */
    async present(): Promise<void> {
        if (this.paused || this.scheduled || this.asyncLoadingElement) {
            return;
        }

        // Wait a bit before presenting the modal, to prevent it being displayed if dismiss is called fast.
        this.scheduled = true;

        await CoreWait.wait(40);

        if (!this.scheduled) {
            return;
        }

        // Present modal.
        this.scheduled = false;

        await this.presentLoadingElement();
    }

    /**
     * Show loading element.
     */
    async resume(): Promise<void> {
        if (!this.paused) {
            return;
        }

        this.paused = false;

        await this.presentLoadingElement();
    }

    /**
     * Update text in the loading element.
     *
     * @param text Text.
     */
    async updateText(text: string): Promise<void> {
        this.text = text;

        if (!this.asyncLoadingElement) {
            return;
        }

        const loadingElement = await this.asyncLoadingElement;
        const contentElement = loadingElement.querySelector('.loading-content');

        if (contentElement) {
            contentElement.innerHTML = text;
        }
    }

    /**
     * Create and present the loading element.
     */
    private async presentLoadingElement(): Promise<void> {
        let resolveLoadingElement!: ((loadingElement: HTMLIonLoadingElement) => void);
        this.asyncLoadingElement = new Promise(resolve => resolveLoadingElement = resolve);

        const loadingElement = await LoadingController.create({ message: this.text });

        await loadingElement.present();

        resolveLoadingElement(loadingElement);
    }

}
