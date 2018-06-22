// (C) Copyright 2015 Martin Dougiamas
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

import { Injectable, NgZone } from '@angular/core';
import { Platform, App, NavController } from 'ionic-angular';
import { Keyboard } from '@ionic-native/keyboard';
import { Network } from '@ionic-native/network';

import { CoreDbProvider } from './db';
import { CoreLoggerProvider } from './logger';
import { CoreEventsProvider } from './events';
import { SQLiteDB } from '@classes/sqlitedb';

/**
 * Data stored for a redirect to another page/site.
 */
export interface CoreRedirectData {
    /**
     * ID of the site to load.
     * @type {string}
     */
    siteId?: string;

    /**
     * Name of the page to redirect to.
     * @type {string}
     */
    page?: string;

    /**
     * Params to pass to the page.
     * @type {any}
     */
    params?: any;

    /**
     * Timestamp when this redirect was last modified.
     * @type {number}
     */
    timemodified?: number;
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

    constructor(dbProvider: CoreDbProvider, private platform: Platform, private keyboard: Keyboard, private appCtrl: App,
            private network: Network, logger: CoreLoggerProvider, events: CoreEventsProvider, zone: NgZone) {
        this.logger = logger.getInstance('CoreAppProvider');
        this.db = dbProvider.getDB(this.DBNAME);

        this.keyboard.onKeyboardShow().subscribe((data) => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(() => {
                document.body.classList.add('keyboard-is-open');
                this.isKeyboardShown = true;
                events.trigger(CoreEventsProvider.KEYBOARD_CHANGE, this.isKeyboardShown);
            });
        });
        this.keyboard.onKeyboardHide().subscribe((data) => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(() => {
                document.body.classList.remove('keyboard-is-open');
                this.isKeyboardShown = false;
                events.trigger(CoreEventsProvider.KEYBOARD_CHANGE, this.isKeyboardShown);
            });
        });
    }

    /**
     * Check if the browser supports mediaDevices.getUserMedia.
     *
     * @return {boolean} Whether the function is supported.
     */
    canGetUserMedia(): boolean {
        return !!(navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Check if the browser supports MediaRecorder.
     *
     * @return {boolean} Whether the function is supported.
     */
    canRecordMedia(): boolean {
        return !!(<any> window).MediaRecorder;
    }

    /**
     * Closes the keyboard.
     */
    closeKeyboard(): void {
        if (this.isMobile()) {
            this.keyboard.close();
        }
    }

    /**
     * Get the application global database.
     *
     * @return {SQLiteDB} App's DB.
     */
    getDB(): SQLiteDB {
        return this.db;
    }

    /**
     * Get the app's root NavController.
     *
     * @return {NavController} Root NavController.
     */
    getRootNavController(): NavController {
        // Function getRootNav is deprecated. Get the first root nav, there should always be one.
        return this.appCtrl.getRootNavs()[0];
    }

    /**
     * Checks if the app is running in a desktop environment (not browser).
     *
     * @return {boolean} Whether the app is running in a desktop environment (not browser).
     */
    isDesktop(): boolean {
        const process = (<any> window).process;

        return !!(process && process.versions && typeof process.versions.electron != 'undefined');
    }

    /**
     * Check if the keyboard is visible.
     *
     * @return {boolean} Whether keyboard is visible.
     */
    isKeyboardVisible(): boolean {
        return this.isKeyboardShown;
    }

    /**
     * Check if the app is running in a Linux environment.
     *
     * @return {boolean} Whether it's running in a Linux environment.
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
     * @return {boolean} Whether it's running in a Mac OS environment.
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
     * Checks if the app is running in a mobile or tablet device (Cordova).
     *
     * @return {boolean} Whether the app is running in a mobile or tablet device.
     */
    isMobile(): boolean {
        return this.platform.is('cordova');
    }

    /**
     * Checks if the current window is wider than a mobile.
     *
     * @return {boolean} Whether the app the current window is wider than a mobile.
     */
    isWide(): boolean {
        return this.platform.width() > 768;
    }

    /**
     * Returns whether we are online.
     *
     * @return {boolean} Whether the app is online.
     */
    isOnline(): boolean {
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
     * @return {boolean} Whether the device uses a limited connection.
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
     * Check if the app is running in a Windows environment.
     *
     * @return {boolean} Whether it's running in a Windows environment.
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
        if (this.isMobile() && !this.platform.is('ios')) {
            this.keyboard.show();
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
     * @return {boolean} Whether there's a SSO authentication ongoing.
     */
    isSSOAuthenticationOngoing(): boolean {
        return !!this.ssoAuthenticationPromise;
    }

    /**
     * Returns a promise that will be resolved once SSO authentication finishes.
     *
     * @return {Promise<any>} Promise resolved once SSO authentication finishes.
     */
    waitForSSOAuthentication(): Promise<any> {
        return this.ssoAuthenticationPromise || Promise.resolve();
    }

    /**
     * Retrieve redirect data.
     *
     * @return {CoreRedirectData} Object with siteid, state, params and timemodified.
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
     * @param {string} siteId Site ID.
     * @param {string} page Page to go.
     * @param {any} params Page params.
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
}
