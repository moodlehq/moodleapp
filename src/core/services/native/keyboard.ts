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

import { Injectable, Signal, effect, signal } from '@angular/core';
import { Keyboard } from '@capacitor/keyboard';
import { CorePlatform } from '@services/platform';
import { makeSingleton, NgZone } from '@singletons';
import { CoreEvents } from '@static/events';

/**
 * Service with helper functions for keyboard management.
 */
@Injectable({ providedIn: 'root' })
export class CoreKeyboardService {

    protected readonly isKeyboardShown = signal(false);
    protected readonly keyboardOpening = signal(false);
    protected readonly keyboardClosing = signal(false);
    protected readonly keyboardHeight = signal(0);

    constructor() {
        effect(() => {
            document.body.classList.toggle('keyboard-is-open', this.isKeyboardShown());
        });
    }

    /**
     * Initialize the service.
     */
    initialize(): void {
        if (!CorePlatform.isMobile()) {
            return;
        }

        // Execute callbacks in the Angular zone, so change detection doesn't stop working.
        Keyboard.addListener('keyboardDidShow', data => NgZone.run(() => this.onKeyboardShow(data.keyboardHeight)));
        Keyboard.addListener('keyboardDidHide', () => NgZone.run(() => this.onKeyboardHide()));
        Keyboard.addListener('keyboardWillShow', data => NgZone.run(() => this.onKeyboardWillShow(data.keyboardHeight)));
        Keyboard.addListener('keyboardWillHide', () => NgZone.run(() => this.onKeyboardWillHide()));
    }

    /**
     * Closes the keyboard.
     */
    close(): void {
        if (CorePlatform.isMobile()) {
            Keyboard.hide();
        }
    }

    /**
     * Open the keyboard.
     */
    open(): void {
        // Open keyboard is not supported in desktop and in iOS.
        if (CorePlatform.isAndroid()) {
            Keyboard.show();
        }
    }

    /**
     * Get a signal that indicates whether the keyboard is shown or not.
     *
     * @returns Signal indicating whether the keyboard is shown.
     */
    get keyboardShownSignal(): Signal<boolean> {
        return this.isKeyboardShown.asReadonly();
    }

    /**
     * Get a signal that indicates the keyboard height.
     *
     * @returns Signal indicating the keyboard height.
     */
    get keyboardHeightSignal(): Signal<number> {
        return this.keyboardHeight.asReadonly();
    }

    /**
     * Notify that Keyboard has been shown.
     *
     * @param keyboardHeight Keyboard height.
     */
    onKeyboardShow(keyboardHeight: number): void {
        this.setKeyboardShown(true, keyboardHeight);
    }

    /**
     * Notify that Keyboard has been hidden.
     */
    onKeyboardHide(): void {
        this.setKeyboardShown(false, 0);
    }

    /**
     * Notify that Keyboard is about to be shown.
     *
     * @param keyboardHeight Keyboard height.
     */
    onKeyboardWillShow(keyboardHeight?: number): void {
        this.keyboardOpening.set(true);
        this.keyboardClosing.set(false);

        if (keyboardHeight !== undefined) {
            this.keyboardHeight.set(keyboardHeight);
        }
    }

    /**
     * Notify that Keyboard is about to be hidden.
     */
    onKeyboardWillHide(): void {
        this.keyboardOpening.set(false);
        this.keyboardClosing.set(true);

        this.keyboardHeight.set(0);
    }

    /**
     * Set keyboard shown or hidden.
     *
     * @param shown Whether the keyboard is shown or hidden.
     * @param keyboardHeight Keyboard height.
     */
    protected setKeyboardShown(shown: boolean, keyboardHeight: number): void {
        this.isKeyboardShown.set(shown);
        this.keyboardOpening.set(false);
        this.keyboardClosing.set(false);
        this.keyboardHeight.set(keyboardHeight);

        // eslint-disable-next-line @typescript-eslint/no-deprecated
        CoreEvents.trigger(CoreEvents.KEYBOARD_CHANGE, keyboardHeight);
    }

    /**
     * Check if the keyboard is closing.
     *
     * @returns Whether keyboard is closing (animating).
     */
    isKeyboardClosing(): boolean {
        return this.keyboardClosing();
    }

    /**
     * Check if the keyboard is being opened.
     *
     * @returns Whether keyboard is opening (animating).
     */
    isKeyboardOpening(): boolean {
        return this.keyboardOpening();
    }

    /**
     * Check if the keyboard is visible.
     *
     * @returns Whether keyboard is visible.
     */
    isKeyboardVisible(): boolean {
        return this.isKeyboardShown();
    }

}

export const CoreKeyboard = makeSingleton(CoreKeyboardService);
