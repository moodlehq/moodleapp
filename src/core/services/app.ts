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

import { CoreAppDB, CoreAppSchema } from './app-db';
import { CoreEvents } from '@singletons/events';
import { SQLiteDB } from '@classes/sqlitedb';
import { makeSingleton, StatusBar } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreColors } from '@singletons/colors';
import { CoreRedirectPayload } from './navigator';
import { CorePromisedValue } from '@classes/promised-value';
import { Subscription } from 'rxjs';
import { CorePlatform } from '@services/platform';
import { CoreKeyboard } from '@singletons/keyboard';
import { CoreNetwork } from './network';
import { CoreSSO } from '@singletons/sso';
import { CoreRedirectData, CoreRedirects } from '@singletons/redirects';
import { MAIN_MENU_VISIBILITY_UPDATED_EVENT } from '@features/mainmenu/constants';

/**
 * Factory to provide some global functionalities.
 */
@Injectable({ providedIn: 'root' })
export class CoreAppProvider {

    protected logger: CoreLogger = CoreLogger.getInstance('CoreApp');

    initialize(): void {
        if (!CorePlatform.isAndroid()) {
            return;
        }

        CoreEvents.on(MAIN_MENU_VISIBILITY_UPDATED_EVENT, () => this.setAndroidNavigationBarColor());
    }

    /**
     * Returns whether the user agent is controlled by automation. I.e. Behat testing.
     *
     * @returns True if the user agent is controlled by automation, false otherwise.
     * @deprecated since 4.4. Use CorePlatform.isAutomated() instead.
     */
    static isAutomated(): boolean {
        return CorePlatform.isAutomated();
    }

    /**
     * Returns the forced timezone to use. Timezone is forced for automated tests.
     *
     * @returns Timezone. Undefined to use the user's timezone.
     * @deprecated since 5.0. Not needed anymore, now the dayjs wrapper will automatically set the timezone when testing.
     */
    static getForcedTimezone(): string | undefined {
        // Use the same timezone forced for LMS in tests.
        return CorePlatform.isAutomated() ? 'Australia/Perth' : undefined;
    }

    /**
     * Check if the browser supports mediaDevices.getUserMedia.
     *
     * @returns Whether the function is supported.
     * @deprecated since 5.0. Use CoreMedia.canGetUserMedia() instead.
     */
    canGetUserMedia(): boolean {
        return !!(navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Check if the browser supports MediaRecorder.
     *
     * @returns Whether the function is supported.
     * @deprecated since 5.0. Use CoreMedia.canRecordMedia() instead.
     */
    canRecordMedia(): boolean {
        return !!window.MediaRecorder;
    }

    /**
     * Closes the keyboard.
     *
     * @deprecated since 4.5.0. Use CoreKeyboard.closeKeyboard instead.
     */
    closeKeyboard(): void {
        CoreKeyboard.close();
    }

    /**
     * Get app store URL.
     *
     * @param storesConfig Config params to send the user to the right place.
     * @returns Store URL.
     */
    getAppStoreUrl(storesConfig: CoreStoreConfig): string | undefined {
        if (CorePlatform.isIOS() && storesConfig.ios) {
            return `itms-apps://itunes.apple.com/app/${storesConfig.ios}`;
        }

        if (CorePlatform.isAndroid() && storesConfig.android) {
            return `market://details?id=${storesConfig.android}`;
        }

        if (CorePlatform.isMobile() && storesConfig.mobile) {
            return storesConfig.mobile;
        }

        return storesConfig.default;
    }

    /**
     * Check if the keyboard is closing.
     *
     * @returns Whether keyboard is closing (animating).
     * @deprecated since 4.5.0. Use CoreKeyboard.isKeyboardClosing instead.
     */
    isKeyboardClosing(): boolean {
        return CoreKeyboard.isKeyboardClosing();
    }

    /**
     * Check if the keyboard is being opened.
     *
     * @returns Whether keyboard is opening (animating).
     * @deprecated since 4.5.0. Use CoreKeyboard.isKeyboardOpening instead.
     */
    isKeyboardOpening(): boolean {
        return CoreKeyboard.isKeyboardOpening();
    }

    /**
     * Check if the keyboard is visible.
     *
     * @returns Whether keyboard is visible.
     * @deprecated since 4.5.0. Use CoreKeyboard.isKeyboardVisible instead.
     */
    isKeyboardVisible(): boolean {
        return CoreKeyboard.isKeyboardVisible();
    }

    /**
     * Checks if the current window is wider than a mobile.
     *
     * @returns Whether the app the current window is wider than a mobile.
     *
     * @deprecated since 5.0. Use CorePlatform.isWide() instead.
     */
    isWide(): boolean {
        return CorePlatform.isWide();
    }

    /**
     * Returns whether we are online.
     *
     * @returns Whether the app is online.
     * @deprecated since 4.1. Use CoreNetwork instead.
     * Keeping this a bit more to avoid plugins breaking.
     */
    isOnline(): boolean {
        return CoreNetwork.isOnline();
    }

    /**
     * Open the keyboard.
     *
     * @deprecated since 4.5.0. Use CoreKeyboard.openKeyboard instead.
     */
    openKeyboard(): void {
        CoreKeyboard.open();
    }

    /**
     * Notify that Keyboard has been shown.
     *
     * @param keyboardHeight Keyboard height.
     * @deprecated since 4.5.0. Use CoreKeyboard.onKeyboardShow instead.
     */
    onKeyboardShow(keyboardHeight: number): void {
        CoreKeyboard.onKeyboardShow(keyboardHeight);
    }

    /**
     * Notify that Keyboard has been hidden.
     *
     * @deprecated since 4.5.0. Use CoreKeyboard.onKeyboardHide instead.
     */
    onKeyboardHide(): void {
        CoreKeyboard.onKeyboardHide();
    }

    /**
     * Notify that Keyboard is about to be shown.
     *
     * @deprecated since 4.5.0. Use CoreKeyboard.onKeyboardWillShow instead.
     */
    onKeyboardWillShow(): void {
        CoreKeyboard.onKeyboardWillShow();
    }

    /**
     * Notify that Keyboard is about to be hidden.
     *
     * @deprecated since 4.5.0. Use CoreKeyboard.onKeyboardWillHide instead.
     */
    onKeyboardWillHide(): void {
        CoreKeyboard.onKeyboardWillHide();
    }

    /**
     * Start an SSO authentication process.
     * Please notice that this function should be called when the app receives the new token from the browser,
     * NOT when the browser is opened.
     *
     * @deprecated since 5.0. Use CoreSSO.startSSOAuthentication instead.
     */
    startSSOAuthentication(): void {
        CoreSSO.startSSOAuthentication();
    }

    /**
     * Finish an SSO authentication process.
     *
     * @deprecated since 5.0. Use CoreSSO.finishSSOAuthentication instead.
     */
    finishSSOAuthentication(): void {
        CoreSSO.finishSSOAuthentication();
    }

    /**
     * Check if there's an ongoing SSO authentication process.
     *
     * @returns Whether there's a SSO authentication ongoing.
     * @deprecated since 5.0. Use CoreSSO.isSSOAuthenticationOngoing instead.
     */
    isSSOAuthenticationOngoing(): boolean {
        return CoreSSO.isSSOAuthenticationOngoing();
    }

    /**
     * Returns a promise that will be resolved once SSO authentication finishes.
     *
     * @returns Promise resolved once SSO authentication finishes.
     * @deprecated since 5.0. Use CoreSSO.waitForSSOAuthentication instead.
     */
    async waitForSSOAuthentication(): Promise<void> {
        return CoreSSO.waitForSSOAuthentication();
    }

    /**
     * Wait until the application is resumed.
     *
     * @param timeout Maximum time to wait, use null to wait forever.
     */
    async waitForResume(timeout: number | null = null): Promise<void> {
        let deferred: CorePromisedValue<void> | null = new CorePromisedValue();
        let resumeSubscription: Subscription | null = null;
        let timeoutId: number | null = null;

        const stopWaiting = () => {
            if (!deferred) {
                return;
            }

            deferred.resolve();
            resumeSubscription?.unsubscribe();
            timeoutId && clearTimeout(timeoutId);

            deferred = null;
        };

        resumeSubscription = CorePlatform.resume.subscribe(stopWaiting);
        timeoutId = timeout ? window.setTimeout(stopWaiting, timeout) : null;

        await deferred;    }

    /**
     * Read redirect data from local storage and clear it if it existed.
     *
     * @deprecated since 5.0. Use CoreRedirects.consumeStorageRedirect instead.
     */
    consumeStorageRedirect(): void {
        CoreRedirects.consumeStorageRedirect();
    }

    /**
     * Retrieve and forget redirect data.
     *
     * @returns Redirect data if any.
     * @deprecated since 5.0. Use CoreRedirects.consumeMemoryRedirect instead.
     */
    consumeMemoryRedirect(): CoreRedirectData | null {
        return CoreRedirects.consumeMemoryRedirect();
    }

    /**
     * Close the app.
     */
    closeApp(): void {
        const nav = <any> window.navigator; // eslint-disable-line @typescript-eslint/no-explicit-any
        nav.app?.exitApp();
    }

    /**
     * Forget redirect data.
     *
     * @deprecated since 5.0. Use CoreRedirects.forgetRedirect instead.
     */
    forgetRedirect(): void {
        CoreRedirects.forgetRedirect();
    }

    /**
     * Retrieve redirect data.
     *
     * @returns Redirect data if any.
     * @deprecated since 5.0. Use CoreRedirects.getRedirect instead.
     */
    getRedirect(): CoreRedirectData | null {
        return CoreRedirects.getRedirect();
    }

    /**
     * Store redirect params.
     *
     * @param siteId Site ID.
     * @param redirectData Redirect data.
     *
     * @deprecated since 5.0. Use CoreRedirects.storeRedirect instead.
     */
    storeRedirect(siteId: string, redirectData: CoreRedirectPayload = {}): void {
        CoreRedirects.storeRedirect(siteId, redirectData);
    }

    /**
     * Set System UI Colors.
     */
    setSystemUIColors(): void {
        this.setStatusBarColor();
        this.setAndroidNavigationBarColor();
    }

    /**
     * Set StatusBar color depending on platform.
     *
     * @param color RGB color to use as status bar background. If not set the css variable will be read.
     */
    setStatusBarColor(color?: string): void {
        if (!CorePlatform.isMobile()) {
            return;
        }

        if (!color) {
            // Get the default color to change it.
            color = CoreColors.getToolbarBackgroundColor();
        }

        this.logger.debug(`Set status bar color ${color}`);

        StatusBar.backgroundColorByHexString(color);
    }

    /**
     * Set NavigationBar color for Android
     *
     * @param color RGB color to use as background. If not set the css variable will be read.
     */
    protected setAndroidNavigationBarColor(color?: string): void {
        if (!CorePlatform.isAndroid()) {
            return;
        }

        if (!color) {
            // Get the default color to change it.
            color = CoreColors.getBottomPageBackgroundColor();
        }

        this.logger.debug(`Set navigation bar color ${color}`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (<any> window).StatusBar.navigationBackgroundColorByHexString(color);
    }

    /**
     * Initialize database.
     *
     * @deprecated since 5.0. Use CoreAppDB.initialize instead.
     */
    async initializeDatabase(): Promise<void> {
        await CoreAppDB.initializeDatabase();
    }

    /**
     * Install and upgrade a certain schema.
     *
     * @param schema The schema to create.
     * @deprecated since 5.0. Use CoreAppDB.createTablesFromSchema instead.
     */
    async createTablesFromSchema(schema: CoreAppSchema): Promise<void> {
        await CoreAppDB.createTablesFromSchema(schema);

    }

    /**
     * Delete table schema.
     *
     * @param name Schema name.
     * @deprecated since 5.0. Use CoreAppDB.deleteTableSchema instead.
     */
    async deleteTableSchema(name: string): Promise<void> {
        await CoreAppDB.deleteTableSchema(name);
    }

    /**
     * Get the application global database.
     *
     * @returns App's DB.
     * @deprecated since 5.0. Use CoreAppDB.getDB instead.
     */
    getDB(): SQLiteDB {
        return CoreAppDB.getDB();
    }

}
export const CoreApp = makeSingleton(CoreAppProvider);

/**
 * Store config data.
 */
export type CoreStoreConfig = {
    /**
     * ID of the Apple store where the mobile iOS app is uploaded.
     */
    ios?: string;

    /**
     * ID of the Google play store where the android app is uploaded.
     */
    android?: string;

    /**
     * Fallback URL when the mobile options is not set.
     */
    mobile?: string;

    /**
     * Fallback URL when the other fallbacks options are not set.
     */
    default?: string;
};
