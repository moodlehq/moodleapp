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

import { CoreAppProvider } from '@providers/app';
import { CoreFileProvider } from '@providers/file';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { Observable, Observer } from 'rxjs';
import { InAppBrowserEvent } from '@ionic-native/in-app-browser';

/**
 * Emulates the Cordova InAppBrowserObject in desktop apps.
 * We aren't extending InAppBrowserObject because its constructor also opens a window, so we'd end up with 2 windows.
 */
export class InAppBrowserObjectMock {
    protected window;
    protected browserWindow;
    protected screen;
    protected isSSO: boolean;

    constructor(appProvider: CoreAppProvider, private fileProvider: CoreFileProvider, private urlUtils: CoreUrlUtilsProvider,
            private url: string, target?: string, options: string = 'location=yes') {

        if (!appProvider.isDesktop()) {
            // This plugin is only supported in desktop.
            return;
        }

        this.browserWindow = require('electron').remote.BrowserWindow;
        this.screen = require('electron').screen;
        this.isSSO = !!(url && url.match(/\/launch\.php\?service=.+&passport=/));

        let width = 800,
            height = 600,
            display;

        const bwOptions: any = {
                webPreferences: {}
            };

        try {
            // Create a separate session for inappbrowser so we can clear its data without affecting the app.
            bwOptions.webPreferences.session = require('electron').remote.session.fromPartition('inappbrowsersession');
        } catch (ex) {
            // Ignore errors.
        }

        if (screen) {
            display = this.screen.getPrimaryDisplay();
            if (display && display.workArea) {
                width = display.workArea.width || width;
                height = display.workArea.height || height;
            }
        }

        // Create the BrowserWindow options based on the received options.
        bwOptions.width = width;
        bwOptions.height = height;
        if (options.indexOf('hidden=yes') != -1) {
            bwOptions.show = false;
        }
        if (options.indexOf('location=no') != -1) {
            bwOptions.frame = false;
        }
        if (options.indexOf('fullscreen=yes') != -1) {
            bwOptions.fullscreen = true;
        }
        if (options.indexOf('clearsessioncache=yes') != -1 && bwOptions.webPreferences.session) {
            bwOptions.webPreferences.session.clearStorageData({storages: 'cookies'});
        }

        this.window = new this.browserWindow(bwOptions);
        this.window.loadURL(url);

        if (this.isSSO) {
            // SSO in Linux. Simulate it's an iOS device so we can retrieve the launch URL.
            // This is needed because custom URL scheme is not supported in Linux.
            const userAgent = 'Mozilla/5.0 (iPad) AppleWebKit/603.3.8 (KHTML, like Gecko) Mobile/14G60';
            this.window.webContents.setUserAgent(userAgent);
        }
    }

    /**
     * Close the window.
     */
    close(): void {
        if (this.window.isDestroyed()) {
            // Window already closed, nothing to do.
            return;
        }

        try {
            this.window.close();
        } catch (ex) {
            // Ignore errors.
        }
    }

    /**
     * Execute a JS script.
     *
     * @param {any} details Details of the script to run, specifying either a file or code key.
     * @return {Promise<any>} Promise resolved when done.
     */
    executeScript(details: any): Promise<any> {
        return new Promise((resolve, reject): void => {
            if (details.code) {
                this.window.webContents.executeJavaScript(details.code, false, resolve);
            } else if (details.file) {
                this.fileProvider.readFile(details.file).then((code) => {
                    this.window.webContents.executeJavaScript(code, false, resolve);
                }).catch(reject);
            } else {
                reject('executeScript requires exactly one of code or file to be specified');
            }
        });
    }

    /**
     * Recursive function to get the launch URL from the contents of a BrowserWindow.
     *
     * @param {number} [retry=0] Retry number.
     * @return {Promise<string>} Promise resolved with the launch URL.
     */
    protected getLaunchUrl(retry: number = 0): Promise<string> {

        if (this.window.isDestroyed()) {
            // Window is destroyed, stop.
            return Promise.reject(null);
        }

        return new Promise((resolve, reject): void => {
            // Execute Javascript to retrieve the launch link.
            const jsCode = 'var el = document.querySelector("#launchapp"); el && el.href;';
            let found = false;
            this.window.webContents.executeJavaScript(jsCode).then((launchUrl) => {
                found = true;
                resolve(launchUrl);
            });

            setTimeout(() => {
                if (found) {
                    // URL found, stop.
                } else if (retry > 5) {
                    // Waited enough, stop.
                    reject();
                } else {
                    this.getLaunchUrl(retry + 1).then(resolve, reject);
                }
            }, 300);

        });
    }

    /**
     * Hide the window.
     */
    hide(): void {
        this.window.hide();
    }

    /**
     * Insert CSS.
     *
     * @param {any} details Details of the CSS to insert, specifying either a file or code key.
     * @return {Promise<any>} Promise resolved when done.
     */
    insertCSS(details: any): Promise<any> {
        return new Promise((resolve, reject): void => {
            if (details.code) {
                this.window.webContents.insertCSS(details.code);
                resolve();
            } else if (details.file) {
                this.fileProvider.readFile(details.file).then((code) => {
                    this.window.webContents.insertCSS(code);
                    resolve();
                }).catch(reject);
            } else {
                reject('insertCSS requires exactly one of code or file to be specified');
            }
        });
    }

    /**
     * Listen to events happening.
     *
     * @param {string} name Name of the event.
     * @return {Observable<InAppBrowserEvent>} Observable that will listen to the event on subscribe, and will stop listening
     *                                         to the event on unsubscribe.
     */
    on(name: string): Observable<InAppBrowserEvent> {
        // Create the observable.
        return new Observable<InAppBrowserEvent>((observer: Observer<InAppBrowserEvent>): any => {
            // Helper functions to handle events.
            const received = (event, url): void => {
                    try {
                        event.url = url || (this.window.isDestroyed() ? '' : this.window.getURL());
                        event.type = name;
                        observer.next(event);
                    } catch (ex) {
                        // Ignore errors.
                    }
                },
                finishLoad = (event): void => {
                    // Check if user is back to launch page.
                    if (this.urlUtils.removeUrlParams(this.url) == this.urlUtils.removeUrlParams(this.window.getURL())) {
                        // The launch page was loaded. Search for the launch link.
                        this.getLaunchUrl().then((launchUrl) => {
                            if (launchUrl) {
                                // Launch URL retrieved, send it and stop listening.
                                received(event, launchUrl);
                            }
                        });
                    }
                };

            if (!this.window.isDestroyed() && !this.window.webContents.isDestroyed()) {
                switch (name) {
                    case 'loadstart':
                        this.window.webContents.on('did-start-loading', received);

                        if (this.isSSO) {
                            // Linux doesn't support custom URL Schemes. Check if launch page is loaded.
                            this.window.webContents.on('did-finish-load', finishLoad);
                        }
                        break;

                    case 'loadstop':
                        this.window.webContents.on('did-finish-load', received);
                        break;

                    case 'loaderror':
                        this.window.webContents.on('did-fail-load', received);
                        break;
                    case 'exit':
                        this.window.on('close', received);
                        break;
                    default:
                }
            }

            return (): void => {
                // Unsubscribing. We need to remove the listeners.
                if (this.window.isDestroyed() || this.window.webContents.isDestroyed()) {
                    // Page has been destroyed already, no need to remove listeners.
                    return;
                }

                switch (name) {
                    case 'loadstart':
                        this.window.webContents.removeListener('did-start-loading', received);
                        this.window.webContents.removeListener('did-finish-load', finishLoad);
                        break;

                    case 'loadstop':
                        this.window.webContents.removeListener('did-finish-load', received);
                        break;

                    case 'loaderror':
                        this.window.webContents.removeListener('did-fail-load', received);
                        break;

                    case 'exit':
                        this.window.removeListener('close', received);
                        break;
                    default:
                }
            };
        });
    }

    /**
     * Show the window.
     */
    show(): void {
        this.window.show();
    }
}
