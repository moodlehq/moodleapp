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

import { Injector, OnInit, Input } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreTextUtilsProvider } from '@providers/utils/text';

/**
 * Template class to easily create components for blocks.
 */
export class CoreBlockBaseComponent implements OnInit {
    @Input() title: string; // The block title.
    @Input() block: any; // The block to render.
    @Input() contextLevel: string; // The context where the block will be used.
    @Input() instanceId: number; // The instance ID associated with the context level.
    @Input() link: string; // Link to go when clicked.
    @Input() linkParams: string; // Link params to go when clicked.

    loaded: boolean; // If the component has been loaded.
    protected fetchContentDefaultError: string; // Default error to show when loading contents.

    protected domUtils: CoreDomUtilsProvider;
    protected textUtils: CoreTextUtilsProvider;
    protected utils: CoreUtilsProvider;
    protected logger;

    constructor(injector: Injector, loggerName: string = 'AddonBlockComponent') {
        this.domUtils = injector.get(CoreDomUtilsProvider);
        this.utils = injector.get(CoreUtilsProvider);
        this.textUtils = injector.get(CoreTextUtilsProvider);
        const loggerProvider = injector.get(CoreLoggerProvider);
        this.logger = loggerProvider.getInstance(loggerName);
    }
    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.loaded = false;
        if (this.block.configs && this.block.configs.length > 0) {
            this.block.configs.map((config) => {
                config.value = this.textUtils.parseJSON(config.value);

                return config;
            });

            this.block.configs = this.utils.arrayToObject(this.block.configs, 'name');
        }

        this.loadContent();
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param done Function to call when done.
     * @param showErrors If show errors to the user of hide them.
     * @return Promise resolved when done.
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
     * @param showErrors Wether to show errors to the user or hide them.
     * @return Resolved when done.
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
     * @return Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        return Promise.resolve();
    }

    /**
     * Loads the component contents and shows the corresponding error.
     *
     * @param refresh Whether we're refreshing data.
     * @param showErrors Wether to show errors to the user or hide them.
     * @return Promise resolved when done.
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
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    protected fetchContent(refresh?: boolean): Promise<any> {
        return Promise.resolve();
    }

}
