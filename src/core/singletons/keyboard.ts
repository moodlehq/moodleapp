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

import { CorePlatform } from '@services/platform';
import { Keyboard } from '@singletons';
import { CoreEvents } from '@singletons/events';

/**
 * Singleton with helper functions for keybard management.
 */
export class CoreKeyboard {

    protected static isKeyboardShown = false;
    protected static keyboardOpening = false;
    protected static keyboardClosing = false;

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
     * Notify that Keyboard has been shown.
     *
     * @param keyboardHeight Keyboard height.
     */
    static onKeyboardShow(keyboardHeight: number): void {
        document.body.classList.add('keyboard-is-open');
        this.setKeyboardShown(true);
        // Error on iOS calculating size.
        // More info: https://github.com/ionic-team/ionic-plugin-keyboard/issues/276 .
        CoreEvents.trigger(CoreEvents.KEYBOARD_CHANGE, keyboardHeight);
    }

    /**
     * Notify that Keyboard has been hidden.
     */
    static onKeyboardHide(): void {
        document.body.classList.remove('keyboard-is-open');
        this.setKeyboardShown(false);
        CoreEvents.trigger(CoreEvents.KEYBOARD_CHANGE, 0);
    }

    /**
     * Notify that Keyboard is about to be shown.
     */
    static onKeyboardWillShow(): void {
        CoreKeyboard.keyboardOpening = true;
        CoreKeyboard.keyboardClosing = false;
    }

    /**
     * Notify that Keyboard is about to be hidden.
     */
    static onKeyboardWillHide(): void {
        CoreKeyboard.keyboardOpening = false;
        CoreKeyboard.keyboardClosing = true;
    }

    /**
     * Set keyboard shown or hidden.
     *
     * @param shown Whether the keyboard is shown or hidden.
     */
    protected static setKeyboardShown(shown: boolean): void {
        CoreKeyboard.isKeyboardShown = shown;
        CoreKeyboard.keyboardOpening = false;
        CoreKeyboard.keyboardClosing = false;
    }

    /**
     * Check if the keyboard is closing.
     *
     * @returns Whether keyboard is closing (animating).
     */
    static isKeyboardClosing(): boolean {
        return CoreKeyboard.keyboardClosing;
    }

    /**
     * Check if the keyboard is being opened.
     *
     * @returns Whether keyboard is opening (animating).
     */
    static isKeyboardOpening(): boolean {
        return CoreKeyboard.keyboardOpening;
    }

    /**
     * Check if the keyboard is visible.
     *
     * @returns Whether keyboard is visible.
     */
    static isKeyboardVisible(): boolean {
        return CoreKeyboard.isKeyboardShown;
    }

}
