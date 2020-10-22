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

import { Injectable, NgZone, ApplicationRef } from '@angular/core';
import { Params } from '@angular/router';
import { Connection } from '@ionic-native/network/ngx';

import { CoreDB } from '@services/db';
import { CoreEvents, CoreEventsProvider } from '@services/events';
import { CoreUtils, PromiseDefer } from '@services/utils/utils';
import { SQLiteDB, SQLiteDBTableSchema } from '@classes/sqlitedb';
import { CoreConstants } from '@core/constants';

import { makeSingleton, Keyboard, Network, StatusBar, Platform } from '@singletons/core.singletons';
import { CoreLogger } from '@singletons/logger';

const DBNAME = 'MoodleMobile';
const SCHEMA_VERSIONS_TABLE = 'schema_versions';

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
@Injectable()
export class CoreAppProvider {

    protected db: SQLiteDB;
    protected logger: CoreLogger;
    protected ssoAuthenticationDeferred?: PromiseDefer<void>;
    protected isKeyboardShown = false;
    protected keyboardOpening = false;
    protected keyboardClosing = false;
    protected backActions: {callback: () => boolean; priority: number}[] = [];
    protected mainMenuId = 0;
    protected mainMenuOpen?: number;
    protected forceOffline = false;

    // Variables for DB.
    protected createVersionsTableReady: Promise<void>;
    protected versionsTableSchema: SQLiteDBTableSchema = {
        name: SCHEMA_VERSIONS_TABLE,
        columns: [
            {
                name: 'name',
                type: 'TEXT',
                primaryKey: true,
            },
            {
                name: 'version',
                type: 'INTEGER',
            },
        ],
    };

    constructor(appRef: ApplicationRef, zone: NgZone) {
        this.logger = CoreLogger.getInstance('CoreAppProvider');
        this.db = CoreDB.instance.getDB(DBNAME);

        // Create the schema versions table.
        this.createVersionsTableReady = this.db.createTableFromSchema(this.versionsTableSchema);

        Keyboard.instance.onKeyboardShow().subscribe((data) => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(() => {
                document.body.classList.add('keyboard-is-open');
                this.setKeyboardShown(true);
                // Error on iOS calculating size.
                // More info: https://github.com/ionic-team/ionic-plugin-keyboard/issues/276 .
                CoreEvents.instance.trigger(CoreEventsProvider.KEYBOARD_CHANGE, data.keyboardHeight);
            });
        });
        Keyboard.instance.onKeyboardHide().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(() => {
                document.body.classList.remove('keyboard-is-open');
                this.setKeyboardShown(false);
                CoreEvents.instance.trigger(CoreEventsProvider.KEYBOARD_CHANGE, 0);
            });
        });
        Keyboard.instance.onKeyboardWillShow().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(() => {
                this.keyboardOpening = true;
                this.keyboardClosing = false;
            });
        });
        Keyboard.instance.onKeyboardWillHide().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(() => {
                this.keyboardOpening = false;
                this.keyboardClosing = true;
            });
        });

        // this.platform.registerBackButtonAction(() => {
        //     this.backButtonAction();
        // }, 100);

        // Export the app provider and appRef to control the application in Behat tests.
        if (CoreAppProvider.isAutomated()) {
            (<WindowForAutomatedTests> window).appProvider = this;
            (<WindowForAutomatedTests> window).appRef = appRef;
        }
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
            Keyboard.instance.hide();
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

        let oldVersion;

        try {
            // Wait for the schema versions table to be created.
            await this.createVersionsTableReady;

            // Fetch installed version of the schema.
            const entry = await this.db.getRecord<SchemaVersionsDBEntry>(SCHEMA_VERSIONS_TABLE, { name: schema.name });

            oldVersion = entry.version;
        } catch (error) {
            // No installed version yet.
            oldVersion = 0;
        }

        if (oldVersion >= schema.version) {
            // Version already installed, nothing else to do.
            return;
        }

        this.logger.debug(`Migrating schema '${schema.name}' of app DB from version ${oldVersion} to ${schema.version}`);

        if (schema.tables) {
            await this.db.createTablesFromSchema(schema.tables);
        }
        if (schema.migrate) {
            await schema.migrate(this.db, oldVersion);
        }

        // Set installed version.
        await this.db.insertRecord(SCHEMA_VERSIONS_TABLE, { name: schema.name, version: schema.version });
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
     */
    getMainMenuId(): number {
        return this.mainMenuId++;
    }

    /**
     * Get app store URL.
     *
     * @param  storesConfig Config params to send the user to the right place.
     * @return Store URL.
     */
    getAppStoreUrl(storesConfig: CoreStoreConfig): string | undefined {
        if (this.isMac() && storesConfig.mac) {
            return 'itms-apps://itunes.apple.com/app/' + storesConfig.mac;
        }

        if (this.isWindows() && storesConfig.windows) {
            return 'https://www.microsoft.com/p/' + storesConfig.windows;
        }

        if (this.isLinux() && storesConfig.linux) {
            return storesConfig.linux;
        }

        if (this.isDesktop() && storesConfig.desktop) {
            return storesConfig.desktop;
        }

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
     * Checks if the app is running in a 64 bits desktop environment (not browser).
     *
     * @return Whether the app is running in a 64 bits desktop environment (not browser).
     */
    is64Bits(): boolean {
        return this.isDesktop() && window.process.arch == 'x64';
    }

    /**
     * Checks if the app is running in an Android mobile or tablet device.
     *
     * @return Whether the app is running in an Android mobile or tablet device.
     */
    isAndroid(): boolean {
        return this.isMobile() && Platform.instance.is('android');
    }

    /**
     * Checks if the app is running in a desktop environment (not browser).
     *
     * @return Whether the app is running in a desktop environment (not browser).
     */
    isDesktop(): boolean {
        // @todo
        return false;
    }

    /**
     * Checks if the app is running in an iOS mobile or tablet device.
     *
     * @return Whether the app is running in an iOS mobile or tablet device.
     */
    isIOS(): boolean {
        return this.isMobile() && !Platform.instance.is('android');
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
     * @return Whether it's running in a Linux environment.
     */
    isLinux(): boolean {
        if (!this.isDesktop()) {
            return false;
        }

        try {
            // @todo return require('os').platform().indexOf('linux') === 0;

            return false;
        } catch (ex) {
            return false;
        }
    }

    /**
     * Check if the app is running in a Mac OS environment.
     *
     * @return Whether it's running in a Mac OS environment.
     */
    isMac(): boolean {
        if (!this.isDesktop()) {
            return false;
        }

        try {
            // @todo return require('os').platform().indexOf('darwin') === 0;

            return false;
        } catch (ex) {
            return false;
        }
    }

    /**
     * Check if the main menu is open.
     *
     * @return Whether the main menu is open.
     */
    isMainMenuOpen(): boolean {
        return typeof this.mainMenuOpen != 'undefined';
    }

    /**
     * Checks if the app is running in a mobile or tablet device (Cordova).
     *
     * @return Whether the app is running in a mobile or tablet device.
     */
    isMobile(): boolean {
        return Platform.instance.is('cordova');
    }

    /**
     * Checks if the current window is wider than a mobile.
     *
     * @return Whether the app the current window is wider than a mobile.
     */
    isWide(): boolean {
        return Platform.instance.width() > 768;
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

        let online = Network.instance.type !== null && Number(Network.instance.type) != Connection.NONE &&
            Number(Network.instance.type) != Connection.UNKNOWN;
        // Double check we are not online because we cannot rely 100% in Cordova APIs. Also, check it in browser.
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
        const type = Network.instance.type;
        if (type === null) {
            // Plugin not defined, probably in browser.
            return false;
        }

        const limited = [Connection.CELL_2G, Connection.CELL_3G, Connection.CELL_4G, Connection.CELL];

        return limited.indexOf(Number(type)) > -1;
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
     * @return Whether it's running in a Windows environment.
     */
    isWindows(): boolean {
        if (!this.isDesktop()) {
            return false;
        }

        try {
            // @todo return require('os').platform().indexOf('win') === 0;

            return false;
        } catch (ex) {
            return false;
        }
    }

    /**
     * Open the keyboard.
     */
    openKeyboard(): void {
        // Open keyboard is not supported in desktop and in iOS.
        if (this.isAndroid()) {
            Keyboard.instance.show();
        }
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
     * Set a main menu as open or not.
     *
     * @param id Main menu ID.
     * @param open Whether it's open or not.
     */
    setMainMenuOpen(id: number, open: boolean): void {
        if (open) {
            this.mainMenuOpen = id;
            CoreEvents.instance.trigger(CoreEventsProvider.MAIN_MENU_OPEN);
        } else if (this.mainMenuOpen == id) {
            delete this.mainMenuOpen;
        }
    }

    /**
     * Start an SSO authentication process.
     * Please notice that this function should be called when the app receives the new token from the browser,
     * NOT when the browser is opened.
     */
    startSSOAuthentication(): void {
        this.ssoAuthenticationDeferred = CoreUtils.instance.promiseDefer<void>();

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
        let deferred: PromiseDefer<void> | null = CoreUtils.instance.promiseDefer<void>();

        const stopWaiting = () => {
            if (!deferred) {
                return;
            }

            deferred.resolve();
            resumeSubscription.unsubscribe();
            timeoutId && clearTimeout(timeoutId);

            deferred = null;
        };

        const resumeSubscription = Platform.instance.resume.subscribe(stopWaiting);
        const timeoutId = timeout ? setTimeout(stopWaiting, timeout) : false;

        await deferred.promise;
    }

    /**
     * Retrieve redirect data.
     *
     * @return Object with siteid, state, params and timemodified.
     */
    getRedirect(): CoreRedirectData {
        if (localStorage?.getItem) {
            try {
                const paramsJson = localStorage.getItem('CoreRedirectParams');
                const data: CoreRedirectData = {
                    siteId: localStorage.getItem('CoreRedirectSiteId') || undefined,
                    page: localStorage.getItem('CoreRedirectState')  || undefined,
                    timemodified: parseInt(localStorage.getItem('CoreRedirectTime') || '0', 10),
                };

                if (paramsJson) {
                    data.params = JSON.parse(paramsJson);
                }

                return data;
            } catch (ex) {
                this.logger.error('Error loading redirect data:', ex);
            }
        }

        return {};
    }

    /**
     * Store redirect params.
     *
     * @param siteId Site ID.
     * @param page Page to go.
     * @param params Page params.
     */
    storeRedirect(siteId: string, page: string, params: Params): void {
        if (localStorage && localStorage.setItem) {
            try {
                localStorage.setItem('CoreRedirectSiteId', siteId);
                localStorage.setItem('CoreRedirectState', page);
                localStorage.setItem('CoreRedirectParams', JSON.stringify(params));
                localStorage.setItem('CoreRedirectTime', String(Date.now()));
            } catch (ex) {
                // Ignore errors.
            }
        }
    }

    /**
     * The back button event is triggered when the user presses the native
     * platform's back button, also referred to as the "hardware" back button.
     * This event is only used within Cordova apps running on Android and
     * Windows platforms. This event is not fired on iOS since iOS doesn't come
     * with a hardware back button in the same sense an Android or Windows device
     * does.
     *
     * Registering a hardware back button action and setting a priority allows
     * apps to control which action should be called when the hardware back
     * button is pressed. This method decides which of the registered back button
     * actions has the highest priority and should be called.
     *
     * @param callback Called when the back button is pressed, if this registered action has the highest priority.
     * @param priority Set the priority for this action. All actions sorted by priority will be executed since one of
     *                 them returns true.
     *                 - Priorities higher or equal than 1000 will go before closing modals
     *                 - Priorities lower than 500 will only be executed if you are in the first state of the app (before exit).
     * @return A function that, when called, will unregister the back button action.
     */
    registerBackButtonAction(callback: () => boolean, priority: number = 0): () => boolean {
        const action = { callback, priority };

        this.backActions.push(action);

        this.backActions.sort((a, b) => b.priority - a.priority);

        return (): boolean => {
            const index = this.backActions.indexOf(action);

            return index >= 0 && !!this.backActions.splice(index, 1);
        };
    }

    /**
     * Set StatusBar color depending on platform.
     */
    setStatusBarColor(): void {
        if (typeof CoreConstants.CONFIG.statusbarbgios == 'string' && this.isIOS()) {
            // IOS Status bar properties.
            StatusBar.instance.overlaysWebView(false);
            StatusBar.instance.backgroundColorByHexString(CoreConstants.CONFIG.statusbarbgios);
            CoreConstants.CONFIG.statusbarlighttextios ? StatusBar.instance.styleLightContent() : StatusBar.instance.styleDefault();
        } else if (typeof CoreConstants.CONFIG.statusbarbgandroid == 'string' && this.isAndroid()) {
            // Android Status bar properties.
            StatusBar.instance.backgroundColorByHexString(CoreConstants.CONFIG.statusbarbgandroid);
            CoreConstants.CONFIG.statusbarlighttextandroid ?
                StatusBar.instance.styleLightContent() : StatusBar.instance.styleDefault();
        } else if (typeof CoreConstants.CONFIG.statusbarbg == 'string') {
            // Generic Status bar properties.
            this.isIOS() && StatusBar.instance.overlaysWebView(false);
            StatusBar.instance.backgroundColorByHexString(CoreConstants.CONFIG.statusbarbg);
            CoreConstants.CONFIG.statusbarlighttext ? StatusBar.instance.styleLightContent() : StatusBar.instance.styleDefault();
        } else {
            // Default Status bar properties.
            this.isAndroid() ? StatusBar.instance.styleLightContent() : StatusBar.instance.styleDefault();
        }
    }

    /**
     * Reset StatusBar color if any was set.
     */
    resetStatusBarColor(): void {
        if (typeof CoreConstants.CONFIG.statusbarbgremotetheme == 'string' &&
                ((typeof CoreConstants.CONFIG.statusbarbgios == 'string' && this.isIOS()) ||
                (typeof CoreConstants.CONFIG.statusbarbgandroid == 'string' && this.isAndroid()) ||
                typeof CoreConstants.CONFIG.statusbarbg == 'string')) {
            // If the status bar has been overriden and there's a fallback color for remote themes, use it now.
            this.isIOS() && StatusBar.instance.overlaysWebView(false);
            StatusBar.instance.backgroundColorByHexString(CoreConstants.CONFIG.statusbarbgremotetheme);
            CoreConstants.CONFIG.statusbarlighttextremotetheme ?
                StatusBar.instance.styleLightContent() : StatusBar.instance.styleDefault();
        }
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

export class CoreApp extends makeSingleton(CoreAppProvider) {}

/**
 * Data stored for a redirect to another page/site.
 */
export type CoreRedirectData = {
    /**
     * ID of the site to load.
     */
    siteId?: string;

    /**
     * Name of the page to redirect to.
     */
    page?: string;

    /**
     * Params to pass to the page.
     */
    params?: Params;

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
     * ID of the Apple store where the desktop Mac app is uploaded.
     */
    mac?: string;

    /**
     * ID of the Windows store where the desktop Windows app is uploaded.
     */
    windows?: string;

    /**
     * Url with the desktop linux download link.
     */
    linux?: string;

    /**
     * Fallback URL when the desktop options is not set.
     */
    desktop?: string;

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

/**
 * Extended window type for automated tests.
 */
export type WindowForAutomatedTests = Window & {
    appProvider?: CoreAppProvider;
    appRef?: ApplicationRef;
};

type SchemaVersionsDBEntry = {
    name: string;
    version: number;
};
