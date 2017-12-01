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

import { Injectable } from '@angular/core';
import { Platform } from 'ionic-angular';
import { Keyboard } from '@ionic-native/keyboard';
import { Network } from '@ionic-native/network';

import { CoreDbProvider } from './db';
import { CoreLoggerProvider } from './logger';
import { SQLiteDB } from '../classes/sqlitedb';

export interface CoreRedirectData {
    siteId?: string;
    page?: string; // Name of the page to redirect.
    params?: any; // Params to pass to the page.
    timemodified?: number;
};

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
    DBNAME = 'MoodleMobile';
    db: SQLiteDB;
    logger;
    ssoAuthenticationPromise : Promise<any>;
    isKeyboardShown: boolean = false;

    constructor(dbProvider: CoreDbProvider, private platform: Platform, private keyboard: Keyboard,
            private network: Network, logger: CoreLoggerProvider) {
        this.logger = logger.getInstance('CoreAppProvider');
        this.db = dbProvider.getDB(this.DBNAME);

        this.keyboard.onKeyboardShow().subscribe((data) => {
            this.isKeyboardShown = true;

        });
        this.keyboard.onKeyboardHide().subscribe((data) => {
            this.isKeyboardShown = false;
        });
    }

    /**
     * Check if the browser supports mediaDevices.getUserMedia.
     *
     * @return {boolean} Whether the function is supported.
     */
    canGetUserMedia() : boolean {
        return !!(navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Check if the browser supports MediaRecorder.
     *
     * @return {boolean} Whether the function is supported.
     */
    canRecordMedia() : boolean {
        return !!(<any>window).MediaRecorder;
    };

    /**
     * Closes the keyboard.
     */
    closeKeyboard() : void {
        if (this.isMobile()) {
            this.keyboard.close();
        }
    };

    /**
     * Get the application global database.
     *
     * @return {SQLiteDB} App's DB.
     */
    getDB() : SQLiteDB {
        return this.db;
    };

    /**
     * Checks if the app is running in a desktop environment (not browser).
     *
     * @return {boolean} Whether the app is running in a desktop environment (not browser).
     */
    isDesktop() : boolean {
        let process = (<any>window).process;
        return !!(process && process.versions && typeof process.versions.electron != 'undefined');
    };

    /**
     * Check if the keyboard is visible.
     *
     * @return {boolean} Whether keyboard is visible.
     */
    isKeyboardVisible() : boolean {
        return this.isKeyboardShown;
    };

    /**
     * Checks if the app is running in a mobile or tablet device (Cordova).
     *
     * @return {boolean} Whether the app is running in a mobile or tablet device.
     */
    isMobile() : boolean {
        return this.platform.is('cordova');
    };

    /**
     * Returns whether we are online.
     *
     * @return {boolean} Whether the app is online.
     */
    isOnline() : boolean {
        let online = this.network.type !== null && this.network.type != Connection.NONE && this.network.type != Connection.UNKNOWN;
        // Double check we are not online because we cannot rely 100% in Cordova APIs. Also, check it in browser.
        if (!online && navigator.onLine) {
            online = true;
        }
        return online;
    };

    /*
     * Check if device uses a limited connection.
     *
     * @return {boolean} Whether the device uses a limited connection.
     */
    isNetworkAccessLimited() : boolean {
        let type = this.network.type;
        if (type === null) {
            // Plugin not defined, probably in browser.
            return false;
        }

        let limited = [Connection.CELL_2G, Connection.CELL_3G, Connection.CELL_4G, Connection.CELL];
        return limited.indexOf(type) > -1;
    };

    /**
     * Open the keyboard.
     */
    openKeyboard() : void {
        // Open keyboard is not supported in desktop and in iOS.
        if (this.isMobile() && !this.platform.is('ios')) {
            this.keyboard.show();
        }
    };

    /**
     * Start an SSO authentication process.
     * Please notice that this function should be called when the app receives the new token from the browser,
     * NOT when the browser is opened.
     */
    startSSOAuthentication() : void {
        this.ssoAuthenticationPromise = new Promise((resolve, reject) => {
            // Store the resolve function in the promise itself.
            (<any>this.ssoAuthenticationPromise).resolve = resolve;

            // Resolve it automatically after 10 seconds (it should never take that long).
            let cancel = setTimeout(() => {
                this.finishSSOAuthentication();
            }, 10000);

            // If the promise is resolved because finishSSOAuthentication is called, stop the cancel promise.
            this.ssoAuthenticationPromise.then(() => {
                clearTimeout(cancel);
            });
        });
    };

    /**
     * Finish an SSO authentication process.
     */
    finishSSOAuthentication() : void {
        if (this.ssoAuthenticationPromise) {
            (<any>this.ssoAuthenticationPromise).resolve && (<any>this.ssoAuthenticationPromise).resolve();
            this.ssoAuthenticationPromise = undefined;
        }
    };

    /**
     * Check if there's an ongoing SSO authentication process.
     *
     * @return {boolean} Whether there's a SSO authentication ongoing.
     */
    isSSOAuthenticationOngoing() : boolean {
        return !!this.ssoAuthenticationPromise;
    };

    /**
     * Returns a promise that will be resolved once SSO authentication finishes.
     *
     * @return {Promise<any>} Promise resolved once SSO authentication finishes.
     */
    waitForSSOAuthentication() : Promise<any> {
        return this.ssoAuthenticationPromise || Promise.resolve();
    };

    /**
     * Retrieve redirect data.
     *
     * @return {CoreRedirectData} Object with siteid, state, params and timemodified.
     */
    getRedirect() : CoreRedirectData {
        if (localStorage && localStorage.getItem) {
            try {
                let data: CoreRedirectData = {
                    siteId: localStorage.getItem('mmCoreRedirectSiteId'),
                    page: localStorage.getItem('mmCoreRedirectState'),
                    params: localStorage.getItem('mmCoreRedirectParams'),
                    timemodified: parseInt(localStorage.getItem('mmCoreRedirectTime'), 10)
                };

                if (data.params) {
                    data.params = JSON.parse(data.params);
                }

                return data;
            } catch(ex) {
                this.logger.error('Error loading redirect data:', ex);
            }
        }

        return {};
    };

    /**
     * Store redirect params.
     *
     * @param {string} siteId Site ID.
     * @param {string} page Page to go.
     * @param {any} params Page params.
     */
    storeRedirect(siteId: string, page: string, params: any) : void {
        if (localStorage && localStorage.setItem) {
            try {
                localStorage.setItem('mmCoreRedirectSiteId', siteId);
                localStorage.setItem('mmCoreRedirectState', page);
                localStorage.setItem('mmCoreRedirectParams', JSON.stringify(params));
                localStorage.setItem('mmCoreRedirectTime', String(Date.now()));
            } catch(ex) {}
        }
    };
}
