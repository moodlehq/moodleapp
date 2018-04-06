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
import { CoreLoggerProvider } from './logger';
import { CoreUtilsProvider } from './utils/utils';

/**
 * Interface that all init handlers must implement.
 */
export interface CoreInitHandler {
    /**
     * A name to identify the handler.
     * @type {string}
     */
    name: string;

    /**
     * Function to execute during the init process.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    load(): Promise<any>;

    /**
     * The highest priority is executed first. You should use values lower than MAX_RECOMMENDED_PRIORITY.
     * @type {number}
     */
    priority?: number;

    /**
     * Set this to true when this process should be resolved before any following one.
     * @type {boolean}
     */
    blocking?: boolean;
}

/*
 * Provider for initialisation mechanisms.
 */
@Injectable()
export class CoreInitDelegate {
    static DEFAULT_PRIORITY = 100; // Default priority for init processes.
    static MAX_RECOMMENDED_PRIORITY = 600;

    protected initProcesses = {};
    protected logger;
    protected readiness;

    constructor(logger: CoreLoggerProvider, platform: Platform, private utils: CoreUtilsProvider) {
        this.logger = logger.getInstance('CoreInitDelegate');
    }

    /**
     * Executes the registered init processes.
     *
     * Reserved for core use, do not call directly.
     */
    executeInitProcesses(): void {
        let ordered = [];

        if (typeof this.readiness == 'undefined') {
            this.initReadiness();
        }

        // Re-ordering by priority.
        for (const name in this.initProcesses) {
            ordered.push(this.initProcesses[name]);
        }
        ordered.sort((a, b) => {
            return b.priority - a.priority;
        });

        ordered = ordered.map((data: CoreInitHandler) => {
            return {
                context: this,
                func: this.prepareProcess,
                params: [data],
                blocking: !!data.blocking
            };
        });

        // Execute all the processes in order to solve dependencies.
        this.utils.executeOrderedPromises(ordered).finally(this.readiness.resolve);
    }

    /**
     * Init the readiness promise.
     */
    protected initReadiness(): void {
        this.readiness = this.utils.promiseDefer();
        this.readiness.promise.then(() => this.readiness.resolved = true);
    }

    /**
     * Instantly returns if the app is ready.
     *
     * @return {boolean} Whether it's ready.
     */
    isReady(): boolean {
        return this.readiness.resolved;
    }

    /**
     * Convenience function to return a function that executes the process.
     *
     * @param {CoreInitHandler} data The data of the process.
     * @return {Promise<any>} Promise of the process.
     */
    protected prepareProcess(data: CoreInitHandler): Promise<any> {
        let promise;

        this.logger.debug(`Executing init process '${data.name}'`);

        try {
            promise = data.load();
        } catch (e) {
            this.logger.error('Error while calling the init process \'' + data.name + '\'. ' + e);

            return;
        }

        return promise;
    }

    /**
     * Notifies when the app is ready. This returns a promise that is resolved when the app is initialised.
     *
     * @return {Promise<any>} Resolved when the app is initialised. Never rejected.
     */
    ready(): Promise<any> {
        if (typeof this.readiness === 'undefined') {
            // Prevent race conditions if this is called before executeInitProcesses.
            this.initReadiness();
        }

        return this.readiness.promise;
    }

    /**
     * Registers an initialisation process.
     *
     * @description
     * Init processes can be used to add initialisation logic to the app. Anything that should block the user interface while
     * some processes are done should be an init process. It is recommended to use a priority lower than MAX_RECOMMENDED_PRIORITY
     * to make sure that your process does not happen before some essential other core processes.
     *
     * An init process should never change state or prompt user interaction.
     *
     * This delegate cannot be used by site plugins.
     *
     * @param {CoreInitHandler} instance The instance of the handler.
     */
    registerProcess(handler: CoreInitHandler): void {
        if (typeof handler.priority == 'undefined') {
            handler.priority = CoreInitDelegate.DEFAULT_PRIORITY;
        }

        if (typeof this.initProcesses[handler.name] != 'undefined') {
            this.logger.log(`Process '${handler.name}' already registered.`);

            return;
        }

        this.logger.log(`Registering process '${handler.name}'.`);
        this.initProcesses[handler.name] = handler;
    }
}
