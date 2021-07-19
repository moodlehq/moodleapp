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

import { CoreDB } from '@services/db';
import { CoreEvents } from '@singletons/events';
import { CoreUtils, PromiseDefer } from '@services/utils/utils';
import { SQLiteDB, SQLiteDBTableSchema } from '@classes/sqlitedb';

import { makeSingleton, Keyboard, Network, StatusBar, Platform, Device } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreColors } from '@singletons/colors';
import { DBNAME, SCHEMA_VERSIONS_TABLE_NAME, SCHEMA_VERSIONS_TABLE_SCHEMA, SchemaVersionsDBEntry } from '@services/database/app';
import { CoreObject } from '@singletons/object';
import { CoreNavigationOptions } from './navigator';

/**
 * Object responsible of managing schema versions.
 */
type SchemaVersionsManager = {
    get(schemaName: string): Promise<number>;
    set(schemaName: string, version: number): Promise<void>;
};

/**
 * Factory to provide some global functionalities, like access to the global app database.
 *
 * @description
 * Each service or component should be responsible of creating their own database tables. Example:
 *
 * ```ts
 * constructor(appProvider: CoreAppProvider) {
 *     this.appDB = appProvider.getDB();
 *     this.appDB.createTableFromSchema(this.tableSchema);
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class CoreAppProvider {

    protected db: SQLiteDB;
    protected logger: CoreLogger;
    protected ssoAuthenticationDeferred?: PromiseDefer<void>;
    protected isKeyboardShown = false;
    protected keyboardOpening = false;
    protected keyboardClosing = false;
    protected forceOffline = false;
    protected redirect?: CoreRedirectData;

    // Variables for DB.
    protected schemaVersionsManager: Promise<SchemaVersionsManager>;
    protected resolveSchemaVersionsManager!: (schemaVersionsManager: SchemaVersionsManager) => void;

    constructor() {
        this.schemaVersionsManager = new Promise(resolve => this.resolveSchemaVersionsManager = resolve);
        this.db = CoreDB.getDB(DBNAME);
        this.logger = CoreLogger.getInstance('CoreAppProvider');
    }

    /**
     * Returns whether the user agent is controlled by automation. I.e. Behat testing.
     *
     * @return True if the user agent is controlled by automation, false otherwise.
     */
    static isAutomated(): boolean {
        return !!navigator.webdriver;
    }

    /**
     * Initialize database.
     */
    async initializeDatabase(): Promise<void> {
        await this.db.createTableFromSchema(SCHEMA_VERSIONS_TABLE_SCHEMA);

        this.resolveSchemaVersionsManager({
            get: async name => {
                try {
                    // Fetch installed version of the schema.
                    const entry = await this.db.getRecord<SchemaVersionsDBEntry>(SCHEMA_VERSIONS_TABLE_NAME, { name });

                    return entry.version;
                } catch (error) {
                    // No installed version yet.
                    return 0;
                }
            },
            set: async (name, version) => {
                await this.db.insertRecord(SCHEMA_VERSIONS_TABLE_NAME, { name, version });
            },
        });
    }

    /**
     * Check if the browser supports mediaDevices.getUserMedia.
     *
     * @return Whether the function is supported.
     */
    canGetUserMedia(): boolean {
        return !!(navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Check if the browser supports MediaRecorder.
     *
     * @return Whether the function is supported.
     */
    canRecordMedia(): boolean {
        return !!window.MediaRecorder;
    }

    /**
     * Closes the keyboard.
     */
    closeKeyboard(): void {
        if (this.isMobile()) {
            Keyboard.hide();
        }
    }

    /**
     * Install and upgrade a certain schema.
     *
     * @param schema The schema to create.
     * @return Promise resolved when done.
     */
    async createTablesFromSchema(schema: CoreAppSchema): Promise<void> {
        this.logger.debug(`Apply schema to app DB: ${schema.name}`);

        const schemaVersionsManager = await this.schemaVersionsManager;
        const oldVersion = await schemaVersionsManager.get(schema.name);

        if (oldVersion >= schema.version) {
            // Version already installed, nothing else to do.
            return;
        }

        this.logger.debug(`Migrating schema '${schema.name}' of app DB from version ${oldVersion} to ${schema.version}`);

        if (schema.tables) {
            await this.db.createTablesFromSchema(schema.tables);
        }
        if (schema.migrate && oldVersion > 0) {
            await schema.migrate(this.db, oldVersion);
        }

        // Set installed version.
        schemaVersionsManager.set(schema.name, schema.version);
    }

    /**
     * Get the application global database.
     *
     * @return App's DB.
     */
    getDB(): SQLiteDB {
        return this.db;
    }

    /**
     * Get an ID for a main menu.
     *
     * @return Main menu ID.
     * @deprecated since 3.9.5. No longer supported.
     */
    getMainMenuId(): number {
        return 0;
    }

    /**
     * Get app store URL.
     *
     * @param storesConfig Config params to send the user to the right place.
     * @return Store URL.
     */
    getAppStoreUrl(storesConfig: CoreStoreConfig): string | undefined {
        if (this.isIOS() && storesConfig.ios) {
            return 'itms-apps://itunes.apple.com/app/' + storesConfig.ios;
        }

        if (this.isAndroid() && storesConfig.android) {
            return 'market://details?id=' + storesConfig.android;
        }

        if (this.isMobile() && storesConfig.mobile) {
            return storesConfig.mobile;
        }

        return storesConfig.default;
    }

    /**
     * Get platform major version number.
     */
    getPlatformMajorVersion(): number {
        if (!this.isMobile()) {
            return 0;
        }

        return Number(Device.version?.split('.')[0]);
    }

    /**
     * Checks if the app is running in a 64 bits desktop environment (not browser).
     *
     * @return false.
     * @deprecated since 3.9.5 Desktop support has been removed.
     */
    is64Bits(): boolean {
        return false;
    }

    /**
     * Checks if the app is running in an Android mobile or tablet device.
     *
     * @return Whether the app is running in an Android mobile or tablet device.
     */
    isAndroid(): boolean {
        return this.isMobile() && Platform.is('android');
    }

    /**
     * Checks if the app is running in a desktop environment (not browser).
     *
     * @return false.
     * @deprecated since 3.9.5 Desktop support has been removed.
     */
    isDesktop(): boolean {
        return false;
    }

    /**
     * Checks if the app is running in an iOS mobile or tablet device.
     *
     * @return Whether the app is running in an iOS mobile or tablet device.
     */
    isIOS(): boolean {
        return this.isMobile() && !Platform.is('android');
    }

    /**
     * Check if the keyboard is closing.
     *
     * @return Whether keyboard is closing (animating).
     */
    isKeyboardClosing(): boolean {
        return this.keyboardClosing;
    }

    /**
     * Check if the keyboard is being opened.
     *
     * @return Whether keyboard is opening (animating).
     */
    isKeyboardOpening(): boolean {
        return this.keyboardOpening;
    }

    /**
     * Check if the keyboard is visible.
     *
     * @return Whether keyboard is visible.
     */
    isKeyboardVisible(): boolean {
        return this.isKeyboardShown;
    }

    /**
     * Check if the app is running in a Linux environment.
     *
     * @return false.
     * @deprecated since 3.9.5 Desktop support has been removed.
     */
    isLinux(): boolean {
        return false;
    }

    /**
     * Check if the app is running in a Mac OS environment.
     *
     * @return false.
     * @deprecated since 3.9.5 Desktop support has been removed.
     */
    isMac(): boolean {
        return false;
    }

    /**
     * Check if the main menu is open.
     *
     * @return Whether the main menu is open.
     * @deprecated since 3.9.5. No longer supported.
     */
    isMainMenuOpen(): boolean {
        return false;
    }

    /**
     * Checks if the app is running in a mobile or tablet device (Cordova).
     *
     * @return Whether the app is running in a mobile or tablet device.
     */
    isMobile(): boolean {
        return Platform.is('cordova');
    }

    /**
     * Checks if the current window is wider than a mobile.
     *
     * @return Whether the app the current window is wider than a mobile.
     */
    isWide(): boolean {
        return Platform.width() > 768;
    }

    /**
     * Returns whether we are online.
     *
     * @return Whether the app is online.
     */
    isOnline(): boolean {
        if (this.forceOffline) {
            return false;
        }

        if (!this.isMobile()) {
            return navigator.onLine;
        }

        let online = Network.type !== null && Network.type != Network.Connection.NONE &&
            Network.type != Network.Connection.UNKNOWN;

        // Double check we are not online because we cannot rely 100% in Cordova APIs.
        if (!online && navigator.onLine) {
            online = true;
        }

        return online;
    }

    /**
     * Check if device uses a limited connection.
     *
     * @return Whether the device uses a limited connection.
     */
    isNetworkAccessLimited(): boolean {
        if (!this.isMobile()) {
            return false;
        }

        const limited = [
            Network.Connection.CELL_2G,
            Network.Connection.CELL_3G,
            Network.Connection.CELL_4G,
            Network.Connection.CELL,
        ];

        return limited.indexOf(Network.type) > -1;
    }

    /**
     * Check if device uses a wifi connection.
     *
     * @return Whether the device uses a wifi connection.
     */
    isWifi(): boolean {
        return this.isOnline() && !this.isNetworkAccessLimited();
    }

    /**
     * Check if the app is running in a Windows environment.
     *
     * @return false.
     * @deprecated since 3.9.5 Desktop support has been removed.
     */
    isWindows(): boolean {
        return false;
    }

    /**
     * Open the keyboard.
     */
    openKeyboard(): void {
        // Open keyboard is not supported in desktop and in iOS.
        if (this.isAndroid()) {
            Keyboard.show();
        }
    }

    /**
     * Notify that Keyboard has been shown.
     *
     * @param keyboardHeight Keyboard height.
     */
    onKeyboardShow(keyboardHeight: number): void {
        document.body.classList.add('keyboard-is-open');
        this.setKeyboardShown(true);
        // Error on iOS calculating size.
        // More info: https://github.com/ionic-team/ionic-plugin-keyboard/issues/276 .
        CoreEvents.trigger(CoreEvents.KEYBOARD_CHANGE, keyboardHeight);
    }

    /**
     * Notify that Keyboard has been hidden.
     */
    onKeyboardHide(): void {
        document.body.classList.remove('keyboard-is-open');
        this.setKeyboardShown(false);
        CoreEvents.trigger(CoreEvents.KEYBOARD_CHANGE, 0);
    }

    /**
     * Notify that Keyboard is about to be shown.
     */
    onKeyboardWillShow(): void {
        this.keyboardOpening = true;
        this.keyboardClosing = false;
    }

    /**
     * Notify that Keyboard is about to be hidden.
     */
    onKeyboardWillHide(): void {
        this.keyboardOpening = false;
        this.keyboardClosing = true;
    }

    /**
     * Set keyboard shown or hidden.
     *
     * @param Whether the keyboard is shown or hidden.
     */
    protected setKeyboardShown(shown: boolean): void {
        this.isKeyboardShown = shown;
        this.keyboardOpening = false;
        this.keyboardClosing = false;
    }

    /**
     * Start an SSO authentication process.
     * Please notice that this function should be called when the app receives the new token from the browser,
     * NOT when the browser is opened.
     */
    startSSOAuthentication(): void {
        this.ssoAuthenticationDeferred = CoreUtils.promiseDefer<void>();

        // Resolve it automatically after 10 seconds (it should never take that long).
        const cancelTimeout = setTimeout(() => this.finishSSOAuthentication(), 10000);

        // If the promise is resolved because finishSSOAuthentication is called, stop the cancel promise.
        // eslint-disable-next-line promise/catch-or-return
        this.ssoAuthenticationDeferred.promise.then(() => clearTimeout(cancelTimeout));
    }

    /**
     * Finish an SSO authentication process.
     */
    finishSSOAuthentication(): void {
        if (this.ssoAuthenticationDeferred) {
            this.ssoAuthenticationDeferred.resolve();
            this.ssoAuthenticationDeferred = undefined;
        }
    }

    /**
     * Check if there's an ongoing SSO authentication process.
     *
     * @return Whether there's a SSO authentication ongoing.
     */
    isSSOAuthenticationOngoing(): boolean {
        return !!this.ssoAuthenticationDeferred;
    }

    /**
     * Returns a promise that will be resolved once SSO authentication finishes.
     *
     * @return Promise resolved once SSO authentication finishes.
     */
    async waitForSSOAuthentication(): Promise<void> {
        const promise = this.ssoAuthenticationDeferred?.promise;

        await promise;
    }

    /**
     * Wait until the application is resumed.
     *
     * @param timeout Maximum time to wait, use null to wait forever.
     */
    async waitForResume(timeout: number | null = null): Promise<void> {
        let deferred: PromiseDefer<void> | null = CoreUtils.promiseDefer<void>();

        const stopWaiting = () => {
            if (!deferred) {
                return;
            }

            deferred.resolve();
            resumeSubscription.unsubscribe();
            timeoutId && clearTimeout(timeoutId);

            deferred = null;
        };

        const resumeSubscription = Platform.resume.subscribe(stopWaiting);
        const timeoutId = timeout ? setTimeout(stopWaiting, timeout) : false;

        await deferred.promise;
    }

    /**
     * Read redirect data from local storage and clear it if it existed.
     */
    consumeStorageRedirect(): void {
        if (!localStorage?.getItem) {
            return;
        }

        try {
            // Read data from storage.
            const jsonData = localStorage.getItem('CoreRedirect');

            if (!jsonData) {
                return;
            }

            // Clear storage.
            localStorage.removeItem('CoreRedirect');

            // Remember redirect data.
            const data: CoreRedirectData = JSON.parse(jsonData);

            if (!CoreObject.isEmpty(data)) {
                this.redirect = data;
            }
        } catch (error) {
            this.logger.error('Error loading redirect data:', error);
        }
    }

    /**
     * Retrieve and forget redirect data.
     *
     * @return Redirect data if any.
     */
    consumeMemoryRedirect(): CoreRedirectData | null {
        const redirect = this.getRedirect();

        this.forgetRedirect();

        return redirect;
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
     */
    forgetRedirect(): void {
        delete this.redirect;
    }

    /**
     * Retrieve redirect data.
     *
     * @return Redirect data if any.
     */
    getRedirect(): CoreRedirectData | null {
        return this.redirect || null;
    }

    /**
     * Store redirect params.
     *
     * @param siteId Site ID.
     * @param page Page to go.
     * @param options Navigation options.
     */
    storeRedirect(siteId: string, page: string, options: CoreNavigationOptions): void {
        try {
            const redirect: CoreRedirectData = {
                siteId,
                page,
                options,
                timemodified: Date.now(),
            };

            localStorage.setItem('CoreRedirect', JSON.stringify(redirect));
        } catch (ex) {
            // Ignore errors.
        }
    }

    /**
     * Register a back button action.
     * This function is deprecated and no longer works. You should now use Ionic events directly, please see:
     * https://ionicframework.com/docs/developing/hardware-back-button
     *
     * @param callback Called when the back button is pressed.
     * @param priority Priority.
     * @return A function that, when called, will unregister the back button action.
     * @deprecated since 3.9.5
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    registerBackButtonAction(callback: () => boolean, priority = 0): () => boolean {
        return () => false;
    }

    /**
     * Set StatusBar color depending on platform.
     *
     * @param color RGB color to use as status bar background. If not set the css variable will be read.
     */
    setStatusBarColor(color?: string): void {
        if (!this.isMobile()) {
            return;
        }

        if (!color) {
            // Get the default color to change it.
            const element = document.querySelector('ion-header ion-toolbar');
            if (element) {
                color = getComputedStyle(element).getPropertyValue('--background').trim();
            } else {
                // Fallback, it won't always work.
                color = getComputedStyle(document.body).getPropertyValue('--core-header-toolbar-background').trim();
            }

            color = CoreColors.getColorHex(color);
        }

        // Make darker on Android, except white.
        if (this.isAndroid()) {
            const rgb = CoreColors.hexToRGB(color);
            if (rgb.red != 255 || rgb.green != 255 || rgb.blue != 255) {
                color = CoreColors.darker(color);
            }
        }

        this.logger.debug(`Set status bar color ${color}`);

        const useLightText = CoreColors.isWhiteContrastingBetter(color);
        const statusBar = StatusBar.instance;

        this.isIOS() && statusBar.overlaysWebView(false);

        // styleDefault will use white text on iOS when darkmode is on. Force the background to black.
        if (this.isIOS() && !useLightText && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            statusBar.backgroundColorByHexString('#000000');
            statusBar.styleLightContent();
        } else {
            statusBar.backgroundColorByHexString(color);
            useLightText ? statusBar.styleLightContent() : statusBar.styleDefault();
        }
    }

    /**
     * Reset StatusBar color if any was set.
     *
     * @deprecated Use setStatusBarColor passing the color of the new statusbar color loaded on remote theme or no color to reset.
     */
    resetStatusBarColor(): void {
        this.setStatusBarColor();
    }

    /**
     * Set value of forceOffline flag. If true, the app will think the device is offline.
     *
     * @param value Value to set.
     */
    setForceOffline(value: boolean): void {
        this.forceOffline = !!value;
    }

}

export const CoreApp = makeSingleton(CoreAppProvider);

/**
 * Data stored for a redirect to another page/site.
 */
export type CoreRedirectData = {
    /**
     * ID of the site to load.
     */
    siteId?: string;

    /**
     * Path of the page to redirect to.
     */
    page?: string;

    /**
     * Options of the navigation.
     */
    options?: CoreNavigationOptions;

    /**
     * Timestamp when this redirect was last modified.
     */
    timemodified?: number;
};

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

/**
 * App DB schema and migration function.
 */
export type CoreAppSchema = {
    /**
     * Name of the schema.
     */
    name: string;

    /**
     * Latest version of the schema (integer greater than 0).
     */
    version: number;

    /**
     * Tables to create when installing or upgrading the schema.
     */
    tables?: SQLiteDBTableSchema[];

    /**
     * Migrates the schema to the latest version.
     *
     * Called when installing and upgrading the schema, after creating the defined tables.
     *
     * @param db The affected DB.
     * @param oldVersion Old version of the schema or 0 if not installed.
     * @return Promise resolved when done.
     */
    migrate?(db: SQLiteDB, oldVersion: number): Promise<void>;
};
