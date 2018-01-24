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
import { CoreEventsProvider } from '../../../providers/events';
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSitesProvider } from '../../../providers/sites';

/**
 * Interface that all handlers must implement.
 */
export interface CoreFileUploaderHandler {
    /**
     * A name to identify the addon.
     * @type {string}
     */
    name: string;

    /**
     * Handler's priority. The highest priority, the highest position.
     * @type {string}
     */
    priority?: number;

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    isEnabled(): boolean|Promise<boolean>;

    /**
     * Given a list of mimetypes, return the ones that are supported by the handler.
     *
     * @param {string[]} [mimetypes] List of mimetypes.
     * @return {string[]} Supported mimetypes.
     */
    getSupportedMimetypes(mimetypes: string[]) : string[];

    /**
     * Get the data to display the handler.
     *
     * @return {CoreFileUploaderHandlerData} Data.
     */
    getData() : CoreFileUploaderHandlerData;
};

/**
 * Data needed to render the handler in the file picker. It must be returned by the handler.
 */
export interface CoreFileUploaderHandlerData {
    /**
     * The title to display in the handler.
     * @type {string}
     */
    title: string;

    /**
     * The icon to display in the handler.
     * @type {string}
     */
    icon?: string;

    /**
     * The class to assign to the handler item.
     * @type {string}
     */
    class?: string;

    /**
     * Action to perform when the handler is clicked.
     *
     * @param {number} [maxSize] Max size of the file. If not defined or -1, no max size.
     * @param {boolean} [upload] Whether the file should be uploaded.
     * @param {boolean} [allowOffline] True to allow selecting in offline, false to require connection.
     * @param {string[]} [mimetypes] List of supported mimetypes. If undefined, all mimetypes supported.
     * @return {Promise<CoreFileUploaderHandlerResult>} Promise resolved with the result of picking/uploading the file.
     */
    action?(maxSize?: number, upload?: boolean, allowOffline?: boolean, mimetypes?: string[])
            : Promise<CoreFileUploaderHandlerResult>;

    /**
     * Function called after the handler is rendered.
     *
     * @param {number} [maxSize] Max size of the file. If not defined or -1, no max size.
     * @param {boolean} [upload] Whether the file should be uploaded.
     * @param {boolean} [allowOffline] True to allow selecting in offline, false to require connection.
     * @param {string[]} [mimetypes] List of supported mimetypes. If undefined, all mimetypes supported.
     */
    afterRender?(maxSize: number, upload: boolean, allowOffline: boolean, mimetypes: string[]) : void;
};

/**
 * The result of clicking a handler.
 */
export interface CoreFileUploaderHandlerResult {
    /**
     * Whether the file was treated (uploaded or copied to tmp folder).
     * @type {boolean}
     */
    treated: boolean;

    /**
     * The path of the file picked. Required if treated=false and fileEntry is not set.
     * @type {string}
     */
    path?: string;

    /**
     * The fileEntry of the file picked. Required if treated=false and path is not set.
     * @type {any}
     */
    fileEntry?: any;

    /**
     * Whether the file should be deleted after the upload. Ignored if treated=true.
     * @type {boolean}
     */
    delete?: boolean;

    /**
     * The result of picking/uploading the file. Ignored if treated=false.
     * @type {any}
     */
    result?: any;
};

/**
 * Data returned by the delegate for each handler.
 */
export interface CoreFileUploaderHandlerDataToReturn extends CoreFileUploaderHandlerData {
    /**
     * Handler's priority.
     * @type {number}
     */
    priority?: number;


    /**
     * Supported mimetypes.
     * @type {string[]}
     */
    mimetypes?: string[];
};

/**
 * Delegate to register handlers to be shown in the file picker.
 */
@Injectable()
export class CoreFileUploaderDelegate {
    protected logger;
    protected handlers: {[s: string]: CoreFileUploaderHandler} = {}; // All registered handlers.
    protected enabledHandlers: {[s: string]: CoreFileUploaderHandler} = {}; // Handlers enabled for the current site.
    protected lastUpdateHandlersStart: number;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, eventsProvider: CoreEventsProvider) {
        this.logger = logger.getInstance('CoreFileUploaderDelegate');

        eventsProvider.on(CoreEventsProvider.LOGIN, this.updateHandlers.bind(this));
        eventsProvider.on(CoreEventsProvider.SITE_UPDATED, this.updateHandlers.bind(this));
        eventsProvider.on(CoreEventsProvider.REMOTE_ADDONS_LOADED, this.updateHandlers.bind(this));
        eventsProvider.on(CoreEventsProvider.LOGOUT, this.clearSiteHandlers.bind(this));
    }

    /**
     * Clear current site handlers. Reserved for core use.
     */
    protected clearSiteHandlers() : void {
        this.enabledHandlers = {};
    }

    /**
     * Get the handlers for the current site.
     *
     * @param {string[]} [mimetypes] List of supported mimetypes. If undefined, all mimetypes supported.
     * @return {CoreFileUploaderHandlerDataToReturn[]} List of handlers data.
     */
    getHandlers(mimetypes: string[]) : CoreFileUploaderHandlerDataToReturn[] {
        let handlers = [];

        for (let name in this.enabledHandlers) {
            let handler = this.enabledHandlers[name],
                supportedMimetypes;

            if (mimetypes) {
                if (!handler.getSupportedMimetypes) {
                    // Handler doesn't implement a required function, don't add it.
                    return;
                }

                supportedMimetypes = handler.getSupportedMimetypes(mimetypes);

                if (!supportedMimetypes.length) {
                    // Handler doesn't support any mimetype, don't add it.
                    return;
                }
            }

            let data : CoreFileUploaderHandlerDataToReturn = handler.getData();
            data.priority = handler.priority;
            data.mimetypes = supportedMimetypes;
            handlers.push(data);
        }

        return handlers;
    }

    /**
     * Check if a time belongs to the last update handlers call.
     * This is to handle the cases where updateHandlers don't finish in the same order as they're called.
     *
     * @param {number} time Time to check.
     * @return {boolean} Whether it's the last call.
     */
    isLastUpdateCall(time: number) : boolean {
        if (!this.lastUpdateHandlersStart) {
            return true;
        }
        return time == this.lastUpdateHandlersStart;
    }

    /**
     * Register a handler.
     *
     * @param {CoreFileUploaderHandler} handler The handler to register.
     * @return {boolean} True if registered successfully, false otherwise.
     */
    registerHandler(handler: CoreFileUploaderHandler) : boolean {
        if (typeof this.handlers[handler.name] !== 'undefined') {
            this.logger.log(`Addon '${handler.name}' already registered`);
            return false;
        }
        this.logger.log(`Registered addon '${handler.name}'`);
        this.handlers[handler.name] = handler;
        return true;
    }

    /**
     * Update the handler for the current site.
     *
     * @param {CoreFileUploaderHandler} handler The handler to check.
     * @param {number} time Time this update process started.
     * @return {Promise<void>} Resolved when done.
     */
    protected updateHandler(handler: CoreFileUploaderHandler, time: number) : Promise<void> {
        let promise,
            siteId = this.sitesProvider.getCurrentSiteId();

        if (!this.sitesProvider.isLoggedIn()) {
            promise = Promise.reject(null);
        } else {
            promise = Promise.resolve(handler.isEnabled());
        }

        // Checks if the handler is enabled.
        return promise.catch(() => {
            return false;
        }).then((enabled: boolean) => {
            // Verify that this call is the last one that was started.
            if (this.isLastUpdateCall(time) && this.sitesProvider.getCurrentSiteId() === siteId) {
                if (enabled) {
                    this.enabledHandlers[handler.name] = handler;
                } else {
                    delete this.enabledHandlers[handler.name];
                }
            }
        });
    }

    /**
     * Update the handlers for the current site.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected updateHandlers() : Promise<any> {
        let promises = [],
            now = Date.now();

        this.logger.debug('Updating handlers for current site.');

        this.lastUpdateHandlersStart = now;

        // Loop over all the handlers.
        for (let name in this.handlers) {
            promises.push(this.updateHandler(this.handlers[name], now));
        }

        return Promise.all(promises).catch(() => {
            // Never reject.
        });
    }
}
