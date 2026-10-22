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
import { fromEventPattern, Observable } from 'rxjs';
import {
    Keyboard as CapacitorKeyboard,
    KeyboardInfo,
    KeyboardResizeOptions,
    KeyboardStyle as CapacitorKeyboardStyle,
} from '@capacitor/keyboard';
import type { PluginListenerHandle } from '@capacitor/core';
import { CoreKeyboard } from '@static/keyboard';

export enum KeyboardStyle {
    Light = 'light',
    Dark = 'dark',
}

export type KeyboardResizeMode = KeyboardResizeOptions['mode'];
/**
 * Service to keep backwards compatibility with Cordova Keyboard service for plugins. Will be removed in the future.
 *
 * @deprecated since 6.0. Use the native Capacitor Keyboard plugin instead.
 */
@Injectable({ providedIn: 'root' })
export class Keyboard {

    /**
     * Check keyboard status visible or not.
     *
     * @returns Whether the keyboard is visible.
     */
    get isVisible(): boolean {
        return CoreKeyboard.isKeyboardVisible();
    }

    /**
     * Hide the keyboard accessory bar with the next, previous and done buttons.
     *
     * @param hide Whether to hide the keyboard accessory bar.
     */
    hideFormAccessoryBar(hide: boolean): void {
        CapacitorKeyboard.setAccessoryBarVisible({ isVisible: !hide });
    }

    /**
     * Force keyboard to be shown.
     */
    show(): void {
        CapacitorKeyboard.show();
    }

    /**
     * Programatically set the resize mode
     *
     * @param mode The resize mode to set.
     */
    setResizeMode(mode: KeyboardResizeMode): void {
        CapacitorKeyboard.setResizeMode({ mode });
    }

    /**
     * Programatically set Keyboard style
     *
     * @param style The keyboard style to set.
     */
    setKeyboardStyle(style: KeyboardStyle): void {
        CapacitorKeyboard.setStyle({
            style: style === KeyboardStyle.Dark ? CapacitorKeyboardStyle.Dark : CapacitorKeyboardStyle.Light,
        });
    }

    /**
     * Programatically enable or disable the WebView scroll
     *
     * @param disable Whether to disable the WebView scroll.
     */
    disableScroll(disable: boolean): void {
        CapacitorKeyboard.setScroll({ isDisabled: disable });
    }

    /**
     * Creates an observable that notifies you when the keyboard is shown. Unsubscribe to observable to cancel event watch.
     *
     * @returns An observable of keyboard show events.
     */
    onKeyboardShow(): Observable<KeyboardInfo> {
        return this.createKeyboardEventObservable<KeyboardInfo>(
            handler => CapacitorKeyboard.addListener('keyboardDidShow', handler),
            info => info,
        );
    }

    /**
     * Creates an observable that notifies you when the keyboard will show. Unsubscribe to observable to cancel event watch.
     *
     * @returns An observable of keyboard will-show events.
     */
    onKeyboardWillShow(): Observable<KeyboardInfo> {
        return this.createKeyboardEventObservable<KeyboardInfo>(
            handler => CapacitorKeyboard.addListener('keyboardWillShow', handler),
            info => info,
        );
    }

    /**
     * Creates an observable that notifies you when the keyboard did show. Unsubscribe to observable to cancel event watch.
     *
     * @returns An observable of keyboard did-show events.
     */
    onKeyboardDidShow(): Observable<KeyboardInfo> {
        return this.createKeyboardEventObservable<KeyboardInfo>(
            handler => CapacitorKeyboard.addListener('keyboardDidShow', handler),
            info => info,
        );
    }

    /**
     * Creates an observable that notifies you when the keyboard is hidden. Unsubscribe to observable to cancel event watch.
     *
     * @returns An observable that emits when the keyboard is hidden.
     */
    onKeyboardHide(): Observable<void> {
        return this.createKeyboardEventObservable<void>(
            handler => CapacitorKeyboard.addListener('keyboardDidHide', handler),
            () => undefined,
        );
    }

    /**
     * Creates an observable that notifies you when the keyboard will hide. Unsubscribe to observable to cancel event watch.
     *
     * @returns An observable that emits when the keyboard is about to be hidden.
     */
    onKeyboardWillHide(): Observable<void> {
        return this.createKeyboardEventObservable<void>(
            handler => CapacitorKeyboard.addListener('keyboardWillHide', handler),
            () => undefined,
        );
    }

    /**
     * Creates an observable that notifies you when the keyboard did hide. Unsubscribe to observable to cancel event watch.
     *
     * @returns An observable that emits when the keyboard is hidden.
     */
    onKeyboardDidHide(): Observable<void> {
        return this.createKeyboardEventObservable<void>(
            handler => CapacitorKeyboard.addListener('keyboardDidHide', handler),
            () => undefined,
        );
    }

    /**
     * Creates an observable from a Capacitor keyboard event and removes its listener on unsubscribe.
     *
     * @param addListener Registers the event callback and returns its listener handle.
     * @param resultSelector Converts event arguments to the observable value.
     * @returns An observable of the selected event value.
     */
    private createKeyboardEventObservable<T>(
        addListener: (handler: (...args: T[]) => void) => Promise<PluginListenerHandle>,
        resultSelector: (...args: T[]) => T,
    ): Observable<T> {
        return fromEventPattern<T>(
            handler => addListener(handler),
            (_, listener: Promise<PluginListenerHandle>) => {
                listener.then(handle => handle.remove()).catch(() => {
                    // Ignore errors when removing the listener.
                });
            },
            resultSelector,
        );
    }

}
