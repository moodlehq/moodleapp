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

import { Injector, OnInit } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreDomUtilsProvider } from '@providers/utils/dom';

/**
 * Template class to easily create components for blocks.
 */
export class CoreBlockBaseComponent implements OnInit {
    loaded: boolean; // If the component has been loaded.
    protected fetchContentDefaultError: string; // Default error to show when loading contents.

    protected domUtils: CoreDomUtilsProvider;
    protected logger;

    constructor(injector: Injector, loggerName: string = 'AddonBlockComponent') {
        this.domUtils = injector.get(CoreDomUtilsProvider);
        const loggerProvider = injector.get(CoreLoggerProvider);
        this.logger = loggerProvider.getInstance(loggerName);
    }
    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.loaded = false;
        this.loadContent();
    }

    /**
     * Refresh the data.
     *
     * @param {any}       [refresher] Refresher.
     * @param {Function}  [done] Function to call when done.
     * @param {boolean}   [showErrors=false] If show errors to the user of hide them.
     * @return {Promise<any>} Promise resolved when done.
     */
    doRefresh(refresher?: any, done?: () => void, showErrors: boolean = false): Promise<any> {
        if (this.loaded) {
            return this.refreshContent(showErrors).finally(() => {
                refresher && refresher.complete();
                done && done();
            });
        }

        return Promise.resolve();
    }

    /**
     * Perform the refresh content function.
     *
     * @param  {boolean}      [showErrors=false] Wether to show errors to the user or hide them.
     * @return {Promise<any>} Resolved when done.
     */
    protected refreshContent(showErrors: boolean = false): Promise<any> {
        // Wrap the call in a try/catch so the workflow isn't interrupted if an error occurs.
        let promise;

        try {
            promise = this.invalidateContent();
        } catch (ex) {
            // An error ocurred in the function, log the error and just resolve the promise so the workflow continues.
            this.logger.error(ex);

            promise = Promise.resolve();
        }

        return promise.catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.loadContent(true, showErrors);
        });
    }

    /**
     * Perform the invalidate content function.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        return Promise.resolve();
    }

    /**
     * Loads the component contents and shows the corresponding error.
     *
     * @param {boolean}       [refresh=false] Whether we're refreshing data.
     * @param  {boolean}      [showErrors=false] Wether to show errors to the user or hide them.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected loadContent(refresh?: boolean, showErrors: boolean = false): Promise<any> {
        // Wrap the call in a try/catch so the workflow isn't interrupted if an error occurs.
        let promise;

        try {
            promise = this.fetchContent(refresh);
        } catch (ex) {
            // An error ocurred in the function, log the error and just resolve the promise so the workflow continues.
            this.logger.error(ex);

            promise = Promise.resolve();
        }

        return promise.catch((error) => {
            // Error getting data, fail.
            this.domUtils.showErrorModalDefault(error, this.fetchContentDefaultError, true);
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Download the component contents.
     *
     * @param {boolean} [refresh] Whether we're refreshing data.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(refresh?: boolean): Promise<any> {
        return Promise.resolve();
    }

}
