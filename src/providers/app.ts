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
import { Platform, App, NavController, MenuController } from 'ionic-angular';
import { Keyboard } from '@ionic-native/keyboard';
import { Network } from '@ionic-native/network';
import { StatusBar } from '@ionic-native/status-bar';

import { CoreDbProvider } from './db';
import { CoreLoggerProvider } from './logger';
import { CoreEventsProvider } from './events';
import { SQLiteDB, SQLiteDBTableSchema } from '@classes/sqlitedb';
import { CoreConfigConstants } from '../configconstants';
import { makeSingleton } from '@singletons/core.singletons';

/**
 * Data stored for a redirect to another page/site.
 */
export interface CoreRedirectData {
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
    params?: any;

    /**
     * Timestamp when this redirect was last modified.
     */
    timemodified?: number;
}

/**
 * Store config data.
 */
export interface CoreStoreConfig {
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
}

/**
 * App DB schema and migration function.
 */
export interface CoreAppSchema {
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
    migrate?(db: SQLiteDB, oldVersion: number): Promise<any>;
}

/**
 * Factory to provide some global functionalities, like access to the global app database.
 * @description
 * Each service or component should be responsible of creating their own database tables. Example:
 *
 * constructor(appProvider: CoreAppProvider) {
 *     this.appDB = appProvider.getDB();
 *     this.appDB.createTableFromSchema(this.tableSchema);
 * }
 */
@Injectable()
export class CoreAppProvider {
    protected DBNAME = 'MoodleMobile';
    protected db: SQLiteDB;
    protected logger;
    protected ssoAuthenticationPromise: Promise<any>;
    protected isKeyboardShown = false;
    protected _isKeyboardOpening = false;
    protected _isKeyboardClosing = false;
    protected backActions = [];
    protected mainMenuId = 0;
    protected mainMenuOpen: number;
    protected forceOffline = false;

    // Variables for DB.
    protected createVersionsTableReady: Promise<any>;
    protected SCHEMA_VERSIONS_TABLE = 'schema_versions';
    protected versionsTableSchema: SQLiteDBTableSchema = {
        name: this.SCHEMA_VERSIONS_TABLE,
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

    constructor(dbProvider: CoreDbProvider,
            private platform: Platform,
            private keyboard: Keyboard,
            private appCtrl: App,
            private network: Network,
            logger: CoreLoggerProvider,
            private events: CoreEventsProvider,
            zone: NgZone,
            private menuCtrl: MenuController,
            private statusBar: StatusBar,
            appRef: ApplicationRef) {

        this.logger = logger.getInstance('CoreAppProvider');
        this.db = dbProvider.getDB(this.DBNAME);

        // Create the schema versions table.
        this.createVersionsTableReady = this.db.createTableFromSchema(this.versionsTableSchema);

        this.keyboard.onKeyboardShow().subscribe((data) => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(() => {
                document.body.classList.add('keyboard-is-open');
                this.setKeyboardShown(true);
                // Error on iOS calculating size.
                // More info: https://github.com/ionic-team/ionic-plugin-keyboard/issues/276 .
                events.trigger(CoreEventsProvider.KEYBOARD_CHANGE, data.keyboardHeight);
            });
        });
        this.keyboard.onKeyboardHide().subscribe((data) => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(() => {
                document.body.classList.remove('keyboard-is-open');
                this.setKeyboardShown(false);
                events.trigger(CoreEventsProvider.KEYBOARD_CHANGE, 0);
            });
        });
        this.keyboard.onKeyboardWillShow().subscribe((data) => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(() => {
                this._isKeyboardOpening = true;
                this._isKeyboardClosing = false;
            });
        });
        this.keyboard.onKeyboardWillHide().subscribe((data) => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(() => {
                this._isKeyboardOpening = false;
                this._isKeyboardClosing = true;
            });
        });

        this.platform.registerBackButtonAction(() => {
            this.backButtonAction();
        }, 100);

        // Export the app provider and appRef to control the application in Behat tests.
        if (CoreAppProvider.isAutomated()) {
            (<any> window).appProvider = this;
            (<any> window).appRef = appRef;
        }
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
        return !!(<any> window).MediaRecorder;
    }

    /**
     * Closes the keyboard.
     */
    closeKeyboard(): void {
        if (this.isMobile()) {
            this.keyboard.hide();
        }
    }

    /**
     * Install and upgrade a certain schema.
     *
     * @param schema The schema to create.
     * @return Promise resolved when done.
     */
    async createTablesFromSchema(schema: CoreAppSchema): Promise<any> {
        this.logger.debug(`Apply schema to app DB: ${schema.name}`);

        let oldVersion;

        try {
            // Wait for the schema versions table to be created.
            await this.createVersionsTableReady;

            // Fetch installed version of the schema.
            const entry = await this.db.getRecord(this.SCHEMA_VERSIONS_TABLE, {name: schema.name});
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
        await this.db.insertRecord(this.SCHEMA_VERSIONS_TABLE, {name: schema.name, version: schema.version});
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
     * Get the app's root NavController.
     *
     * @return Root NavController.
     */
    getRootNavController(): NavController {
        // Function getRootNav is deprecated. Get the first root nav, there should always be one.
        return this.appCtrl.getRootNavs()[0];
    }

    /**
     * Get app store URL.
     *
     * @param  storesConfig Config params to send the user to the right place.
     * @return Store URL.
     */
     getAppStoreUrl(storesConfig: CoreStoreConfig): string {
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

        return storesConfig.default || null;
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
     * Checks if the app is running in a 64 bits desktop environment (not browser).
     *
     * @return Whether the app is running in a 64 bits desktop environment (not browser).
     */
    is64Bits(): boolean {
        const process = (<any> window).process;

        return this.isDesktop() && process.arch == 'x64';
    }

    /**
     * Checks if the app is running in an Android mobile or tablet device.
     *
     * @return Whether the app is running in an Android mobile or tablet device.
     */
    isAndroid(): boolean {
        return this.isMobile() && this.platform.is('android');
    }

    /**
     * Checks if the app is running in a desktop environment (not browser).
     *
     * @return Whether the app is running in a desktop environment (not browser).
     */
    isDesktop(): boolean {
        const process = (<any> window).process;

        return !!(process && process.versions && typeof process.versions.electron != 'undefined');
    }

    /**
     * Checks if the app is running in an iOS mobile or tablet device.
     *
     * @return Whether the app is running in an iOS mobile or tablet device.
     */
    isIOS(): boolean {
        return this.isMobile() && !this.platform.is('android');
    }

    /**
     * Check if the keyboard is closing.
     *
     * @return Whether keyboard is closing (animating).
     */
    isKeyboardClosing(): boolean {
        return this._isKeyboardClosing;
    }

    /**
     * Check if the keyboard is being opened.
     *
     * @return Whether keyboard is opening (animating).
     */
    isKeyboardOpening(): boolean {
        return this._isKeyboardOpening;
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
            return require('os').platform().indexOf('linux') === 0;
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
            return require('os').platform().indexOf('darwin') === 0;
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
        return this.platform.is('cordova');
    }

    /**
     * Checks if the current window is wider than a mobile.
     *
     * @return Whether the app the current window is wider than a mobile.
     */
    isWide(): boolean {
        return this.platform.width() > 768;
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

        let online = this.network.type !== null && this.network.type != Connection.NONE && this.network.type != Connection.UNKNOWN;
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
        const type = this.network.type;
        if (type === null) {
            // Plugin not defined, probably in browser.
            return false;
        }

        const limited = [Connection.CELL_2G, Connection.CELL_3G, Connection.CELL_4G, Connection.CELL];

        return limited.indexOf(type) > -1;
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
            return require('os').platform().indexOf('win') === 0;
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
            this.keyboard.show();
        }
    }

    /**
     * Set keyboard shown or hidden.
     *
     * @param Whether the keyboard is shown or hidden.
     */
    protected setKeyboardShown(shown: boolean): void {
        this.isKeyboardShown = shown;
        this._isKeyboardOpening = false;
        this._isKeyboardClosing = false;
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
            this.events.trigger(CoreEventsProvider.MAIN_MENU_OPEN);
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
        let cancelTimeout,
            resolvePromise;

        this.ssoAuthenticationPromise = new Promise((resolve, reject): void => {
            resolvePromise = resolve;

            // Resolve it automatically after 10 seconds (it should never take that long).
            cancelTimeout = setTimeout(() => {
                this.finishSSOAuthentication();
            }, 10000);
        });

        // Store the resolve function in the promise itself.
        (<any> this.ssoAuthenticationPromise).resolve = resolvePromise;

        // If the promise is resolved because finishSSOAuthentication is called, stop the cancel promise.
        this.ssoAuthenticationPromise.then(() => {
            clearTimeout(cancelTimeout);
        });
    }

    /**
     * Finish an SSO authentication process.
     */
    finishSSOAuthentication(): void {
        if (this.ssoAuthenticationPromise) {
            (<any> this.ssoAuthenticationPromise).resolve && (<any> this.ssoAuthenticationPromise).resolve();
            this.ssoAuthenticationPromise = undefined;
        }
    }

    /**
     * Check if there's an ongoing SSO authentication process.
     *
     * @return Whether there's a SSO authentication ongoing.
     */
    isSSOAuthenticationOngoing(): boolean {
        return !!this.ssoAuthenticationPromise;
    }

    /**
     * Returns a promise that will be resolved once SSO authentication finishes.
     *
     * @return Promise resolved once SSO authentication finishes.
     */
    waitForSSOAuthentication(): Promise<any> {
        return this.ssoAuthenticationPromise || Promise.resolve();
    }

    /**
     * Wait until the application is resumed.
     *
     * @param timeout Maximum time to wait, use null to wait forever.
     */
    async waitForResume(timeout: number | null = null): Promise<void> {
        let resolve: Function;
        let resumeSubscription: any;
        let timeoutId: NodeJS.Timer | false;

        const promise = new Promise((r): any => resolve = r);
        const stopWaiting = (): any => {
            if (!resolve) {
                return;
            }

            resolve();
            resumeSubscription.unsubscribe();
            timeoutId && clearTimeout(timeoutId);

            resolve = null;
        };

        resumeSubscription = this.platform.resume.subscribe(stopWaiting);
        timeoutId = timeout ? setTimeout(stopWaiting, timeout) : false;

        await promise;
    }

    /**
     * Retrieve redirect data.
     *
     * @return Object with siteid, state, params and timemodified.
     */
    getRedirect(): CoreRedirectData {
        if (localStorage && localStorage.getItem) {
            try {
                const data: CoreRedirectData = {
                    siteId: localStorage.getItem('CoreRedirectSiteId'),
                    page: localStorage.getItem('CoreRedirectState'),
                    params: localStorage.getItem('CoreRedirectParams'),
                    timemodified: parseInt(localStorage.getItem('CoreRedirectTime'), 10)
                };

                if (data.params) {
                    data.params = JSON.parse(data.params);
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
    storeRedirect(siteId: string, page: string, params: any): void {
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
     * Implement the backbutton actions pile.
     */
    backButtonAction(): void {
        let x = 0;
        for (; x < this.backActions.length; x++) {
            if (this.backActions[x].priority < 1000) {
                break;
            }
            // Stop in the first action taken.
            if (this.backActions[x].fn()) {
                return;
            }
        }

        // Close open modals if any.
        if (this.menuCtrl && this.menuCtrl.isOpen()) {
            this.menuCtrl.close();

            return;
        }

        // Remaining actions will have priority less than 1000.
        for (; x < this.backActions.length; x++) {
            if (this.backActions[x].priority < 500) {
                break;
            }
            // Stop in the first action taken.
            if (this.backActions[x].fn()) {
                return;
            }
        }

        // Nothing found, go back.
        const navPromise = this.appCtrl.navPop();
        if (navPromise) {
            return;
        }

        // No views to go back to.

        // Remaining actions will have priority less than 500.
        for (; x < this.backActions.length; x++) {
            // Stop in the first action taken.
            if (this.backActions[x].fn()) {
                return;
            }
        }

        // Ionic will decide (exit the app).
        this.appCtrl.goBack();
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
     * @param fn Called when the back button is pressed,
     *           if this registered action has the highest priority.
     * @param priority Set the priority for this action. All actions sorted by priority will be executed since one of
     *                 them returns true.
     *                 * Priorities higher or equal than 1000 will go before closing modals
     *                 * Priorities lower than 500 will only be executed if you are in the first state of the app (before exit).
     * @return A function that, when called, will unregister
     *         the back button action.
     */
    registerBackButtonAction(fn: Function, priority: number = 0): Function {
        const action = { fn: fn, priority: priority };

        this.backActions.push(action);

        this.backActions.sort((a, b) => {
            return b.priority - a.priority;
        });

        return (): boolean => {
            const index = this.backActions.indexOf(action);

            return index >= 0 && !!this.backActions.splice(index, 1);
        };
    }

    /**
     * Set StatusBar color depending on platform.
     */
    setStatusBarColor(): void {
        if (typeof CoreConfigConstants.statusbarbgios == 'string' && this.isIOS()) {
            // IOS Status bar properties.
            this.statusBar.overlaysWebView(false);
            this.statusBar.backgroundColorByHexString(CoreConfigConstants.statusbarbgios);
            CoreConfigConstants.statusbarlighttextios ? this.statusBar.styleLightContent() : this.statusBar.styleDefault();
        } else if (typeof CoreConfigConstants.statusbarbgandroid == 'string' && this.isAndroid()) {
            // Android Status bar properties.
            this.statusBar.backgroundColorByHexString(CoreConfigConstants.statusbarbgandroid);
            CoreConfigConstants.statusbarlighttextandroid ? this.statusBar.styleLightContent() : this.statusBar.styleDefault();
        } else if (typeof CoreConfigConstants.statusbarbg == 'string') {
            // Generic Status bar properties.
            this.isIOS() && this.statusBar.overlaysWebView(false);
            this.statusBar.backgroundColorByHexString(CoreConfigConstants.statusbarbg);
            CoreConfigConstants.statusbarlighttext ? this.statusBar.styleLightContent() : this.statusBar.styleDefault();
        } else {
            // Default Status bar properties.
            this.isAndroid() ? this.statusBar.styleLightContent() : this.statusBar.styleDefault();
        }
    }

    /**
     * Reset StatusBar color if any was set.
     */
    resetStatusBarColor(): void {
        if (typeof CoreConfigConstants.statusbarbgremotetheme == 'string' &&
                ((typeof CoreConfigConstants.statusbarbgios == 'string' && this.isIOS()) ||
                (typeof CoreConfigConstants.statusbarbgandroid == 'string' && this.isAndroid()) ||
                typeof CoreConfigConstants.statusbarbg == 'string')) {
            // If the status bar has been overriden and there's a fallback color for remote themes, use it now.
            this.isIOS() && this.statusBar.overlaysWebView(false);
            this.statusBar.backgroundColorByHexString(CoreConfigConstants.statusbarbgremotetheme);
            CoreConfigConstants.statusbarlighttextremotetheme ?
                this.statusBar.styleLightContent() : this.statusBar.styleDefault();
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
