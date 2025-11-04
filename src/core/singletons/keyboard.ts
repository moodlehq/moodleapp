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

import { effect, Signal, signal } from '@angular/core';
import { CorePlatform } from '@services/platform';
import { Keyboard } from '@singletons';
import { CoreEvents } from '@singletons/events';

/**
 * Singleton with helper functions for keybard management.
 */
export class CoreKeyboard {

    protected static readonly IS_KEYBOARD_SHOWN = signal(false);
    protected static readonly KEYBOARD_OPENING = signal(false);
    protected static readonly KEYBOARD_CLOSING = signal(false);
    protected static readonly KEYBOARD_HEIGHT = signal(0);

    // Avoid creating singleton instances.
    private constructor() {
        effect(() => {
            document.body.classList.toggle('keyboard-is-open', CoreKeyboard.IS_KEYBOARD_SHOWN());
        });
    }

    /**
     * Closes the keyboard.
     */
    static close(): void {
        if (CorePlatform.isMobile()) {
            Keyboard.hide();
        }
    }

    /**
     * Open the keyboard.
     */
    static open(): void {
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
    static get keyboardShownSignal(): Signal<boolean> {
        return CoreKeyboard.IS_KEYBOARD_SHOWN.asReadonly();
    }

    /**
     * Get a signal that indicates the keyboard height.
     *
     * @returns Signal indicating the keyboard height.
     */
    static get keyboardHeightSignal(): Signal<number> {
        return CoreKeyboard.KEYBOARD_HEIGHT.asReadonly();
    }

    /**
     * Notify that Keyboard has been shown.
     *
     * @param keyboardHeight Keyboard height.
     */
    static onKeyboardShow(keyboardHeight: number): void {
        // Error on iOS calculating size.
        // More info: https://github.com/ionic-team/ionic-plugin-keyboard/issues/276
        CoreKeyboard.setKeyboardShown(true, keyboardHeight);
    }

    /**
     * Notify that Keyboard has been hidden.
     */
    static onKeyboardHide(): void {
        CoreKeyboard.setKeyboardShown(false, 0);
    }

    /**
     * Notify that Keyboard is about to be shown.
     *
     * @param keyboardHeight Keyboard height.
     */
    static onKeyboardWillShow(keyboardHeight?: number): void {
        CoreKeyboard.KEYBOARD_OPENING.set(true);
        CoreKeyboard.KEYBOARD_CLOSING.set(false);

        if (keyboardHeight !== undefined) {
            this.KEYBOARD_HEIGHT.set(keyboardHeight);
        }
    }

    /**
     * Notify that Keyboard is about to be hidden.
     */
    static onKeyboardWillHide(): void {
        CoreKeyboard.KEYBOARD_OPENING.set(false);
        CoreKeyboard.KEYBOARD_CLOSING.set(true);

        this.KEYBOARD_HEIGHT.set(0);
    }

    /**
     * Set keyboard shown or hidden.
     *
     * @param shown Whether the keyboard is shown or hidden.
     * @param keyboardHeight Keyboard height.
     */
    protected static setKeyboardShown(shown: boolean, keyboardHeight: number): void {
        CoreKeyboard.IS_KEYBOARD_SHOWN.set(shown);
        CoreKeyboard.KEYBOARD_OPENING.set(false);
        CoreKeyboard.KEYBOARD_CLOSING.set(false);
        this.KEYBOARD_HEIGHT.set(keyboardHeight);

        // eslint-disable-next-line @typescript-eslint/no-deprecated
        CoreEvents.trigger(CoreEvents.KEYBOARD_CHANGE, keyboardHeight);
    }

    /**
     * Check if the keyboard is closing.
     *
     * @returns Whether keyboard is closing (animating).
     */
    static isKeyboardClosing(): boolean {
        return CoreKeyboard.KEYBOARD_CLOSING();
    }

    /**
     * Check if the keyboard is being opened.
     *
     * @returns Whether keyboard is opening (animating).
     */
    static isKeyboardOpening(): boolean {
        return CoreKeyboard.KEYBOARD_OPENING();
    }

    /**
     * Check if the keyboard is visible.
     *
     * @returns Whether keyboard is visible.
     */
    static isKeyboardVisible(): boolean {
        return CoreKeyboard.IS_KEYBOARD_SHOWN();
    }

}
