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
import { Network } from '@ionic-native/network';
import { CoreAppProvider } from './app';
import { CoreConfigProvider } from './config';
import { CoreLoggerProvider } from './logger';
import { CoreUtilsProvider } from './utils/utils';
import { CoreConstants } from '@core/constants';
import { SQLiteDB, SQLiteDBTableSchema } from '@classes/sqlitedb';

/**
 * Interface that all cron handlers must implement.
 */
export interface CoreCronHandler {
    /**
     * A name to identify the handler.
     * @type {string}
     */
    name: string;

    /**
     * Returns handler's interval in milliseconds. Defaults to CoreCronDelegate.DEFAULT_INTERVAL.
     *
     * @return {number} Interval time (in milliseconds).
     */
    getInterval?(): number;

    /**
     * Check whether the process uses network or not. True if not defined.
     *
     * @return {boolean} Whether the process uses network or not
     */
    usesNetwork?(): boolean;

    /**
     * Check whether it's a synchronization process or not. True if not defined.
     *
     * @return {boolean} Whether it's a synchronization process or not.
     */
    isSync?(): boolean;

    /**
     * Check whether the sync can be executed manually. Call isSync if not defined.
     *
     * @return {boolean} Whether the sync can be executed manually.
     */
    canManualSync?(): boolean;

    /**
     * Execute the process.
     *
     * @param {string} [siteId] ID of the site affected. If not defined, all sites.
     * @param {boolean} [force] Determines if it's a forced execution.
     * @return {Promise<any>} Promise resolved when done. If the promise is rejected, this function will be called again often,
     *                        it shouldn't be abused.
     */
    execute?(siteId?: string, force?: boolean): Promise<any>;

    /**
     * Whether the handler is running. Used internally by the provider, there's no need to set it.
     * @type {boolean}
     */
    running?: boolean;

    /**
     * Timeout ID for the handler scheduling. Used internally by the provider, there's no need to set it.
     * @type {number}
     */
    timeout?: number;
}

/*
 * Service to handle cron processes. The registered processes will be executed every certain time.
*/
@Injectable()
export class CoreCronDelegate {
    // Constants.
    static DEFAULT_INTERVAL = 3600000; // Default interval is 1 hour.
    static MIN_INTERVAL = 300000; // Minimum interval is 5 minutes.
    static DESKTOP_MIN_INTERVAL = 60000; // Minimum interval in desktop is 1 minute.
    static MAX_TIME_PROCESS = 120000; // Max time a process can block the queue. Defaults to 2 minutes.

    // Variables for database.
    protected CRON_TABLE = 'cron';
    protected tableSchema: SQLiteDBTableSchema = {
        name: this.CRON_TABLE,
        columns: [
            {
                name: 'id',
                type: 'TEXT',
                primaryKey: true
            },
            {
                name: 'value',
                type: 'INTEGER'
            }
        ]
    };

    protected logger;
    protected appDB: SQLiteDB;
    protected handlers: { [s: string]: CoreCronHandler } = {};
    protected queuePromise = Promise.resolve();

    constructor(logger: CoreLoggerProvider, private appProvider: CoreAppProvider, private configProvider: CoreConfigProvider,
            private utils: CoreUtilsProvider, network: Network, zone: NgZone) {
        this.logger = logger.getInstance('CoreCronDelegate');

        this.appDB = this.appProvider.getDB();
        this.appDB.createTableFromSchema(this.tableSchema);

        // When the app is re-connected, start network handlers that were stopped.
        network.onConnect().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(() => {
                this.startNetworkHandlers();
            });
        });
    }

    /**
     * Try to execute a handler. It will schedule the next execution once done.
     * If the handler cannot be executed or it fails, it will be re-executed after mmCoreCronMinInterval.
     *
     * @param {string} name Name of the handler.
     * @param {boolean} [force] Wether the execution is forced (manual sync).
     * @param {string}  [siteId] Site ID. If not defined, all sites.
     * @return {Promise<any>} Promise resolved if handler is executed successfully, rejected otherwise.
     */
    protected checkAndExecuteHandler(name: string, force?: boolean, siteId?: string): Promise<any> {
        if (!this.handlers[name] || !this.handlers[name].execute) {
            // Invalid handler.
            this.logger.debug('Cannot execute handler because is invalid: ' + name);

            return Promise.reject(null);
        }

        const usesNetwork = this.handlerUsesNetwork(name),
            isSync = !force && this.isHandlerSync(name);
        let promise;

        if (usesNetwork && !this.appProvider.isOnline()) {
            // Offline, stop executing.
            this.logger.debug('Cannot execute handler because device is offline: ' + name);
            this.stopHandler(name);

            return Promise.reject(null);
        }

        if (isSync) {
            // Check network connection.
            promise = this.configProvider.get(CoreConstants.SETTINGS_SYNC_ONLY_ON_WIFI, false).then((syncOnlyOnWifi) => {
                return !syncOnlyOnWifi || this.appProvider.isWifi();
            });
        } else {
            promise = Promise.resolve(true);
        }

        return promise.then((execute: boolean) => {
            if (!execute) {
                // Cannot execute in this network connection, retry soon.
                this.logger.debug('Cannot execute handler because device is using limited connection: ' + name);
                this.scheduleNextExecution(name, CoreCronDelegate.MIN_INTERVAL);

                return Promise.reject(null);
            }

            // Add the execution to the queue.
            this.queuePromise = this.queuePromise.catch(() => {
                // Ignore errors in previous handlers.
            }).then(() => {
                return this.executeHandler(name, force, siteId).then(() => {
                    this.logger.debug(`Execution of handler '${name}' was a success.`);

                    return this.setHandlerLastExecutionTime(name, Date.now()).then(() => {
                        this.scheduleNextExecution(name);
                    });
                }, (error) => {
                    // Handler call failed. Retry soon.
                    this.logger.error(`Execution of handler '${name}' failed.`, error);
                    this.scheduleNextExecution(name, CoreCronDelegate.MIN_INTERVAL);

                    return Promise.reject(null);
                });
            });

            return this.queuePromise;
        });
    }

    /**
     * Run a handler, cancelling the execution if it takes more than MAX_TIME_PROCESS.
     *
     * @param {string} name Name of the handler.
     * @param {boolean} [force] Wether the execution is forced (manual sync).
     * @param {string} [siteId] Site ID. If not defined, all sites.
     * @return {Promise<any>} Promise resolved when the handler finishes or reaches max time, rejected if it fails.
     */
    protected executeHandler(name: string, force?: boolean, siteId?: string): Promise<any> {
        return new Promise((resolve, reject): void => {
            let cancelTimeout;

            this.logger.debug('Executing handler: ' + name);

            // Wrap the call in Promise.resolve to make sure it's a promise.
            Promise.resolve(this.handlers[name].execute(siteId, force)).then(resolve).catch(reject).finally(() => {
                clearTimeout(cancelTimeout);
            });

            cancelTimeout = setTimeout(() => {
                // The handler took too long. Resolve because we don't want to retry soon.
                this.logger.debug(`Resolving execution of handler '${name}' because it took too long.`);
                resolve();
            }, CoreCronDelegate.MAX_TIME_PROCESS);
        });
    }

    /**
     * Force execution of synchronization cron tasks without waiting for the scheduled time.
     * Please notice that some tasks may not be executed depending on the network connection and sync settings.
     *
     * @param {string} [siteId] Site ID. If not defined, all sites.
     * @return {Promise<any>} Promise resolved if all handlers are executed successfully, rejected otherwise.
     */
    forceSyncExecution(siteId?: string): Promise<any> {
        const promises = [];

        for (const name in this.handlers) {
            if (this.isHandlerManualSync(name)) {
                // Now force the execution of the handler.
                promises.push(this.forceCronHandlerExecution(name, siteId));
            }
        }

        return this.utils.allPromises(promises);
    }

    /**
     * Force execution of a cron tasks without waiting for the scheduled time.
     * Please notice that some tasks may not be executed depending on the network connection and sync settings.
     *
     * @param {string} [name]  If provided, the name of the handler.
     * @param {string} [siteId] Site ID. If not defined, all sites.
     * @return {Promise<any>} Promise resolved if handler has been executed successfully, rejected otherwise.
     */
    forceCronHandlerExecution(name?: string, siteId?: string): Promise<any> {
        const handler = this.handlers[name];

        // Mark the handler as running (it might be running already).
        handler.running = true;

        // Cancel pending timeout.
        clearTimeout(handler.timeout);
        delete handler.timeout;

        // Now force the execution of the handler.
        return this.checkAndExecuteHandler(name, true, siteId);
    }

    /**
     * Get a handler's interval.
     *
     * @param {string} name Handler's name.
     * @return {number} Handler's interval.
     */
    protected getHandlerInterval(name: string): number {
        if (!this.handlers[name] || !this.handlers[name].getInterval) {
            // Invalid, return default.
            return CoreCronDelegate.DEFAULT_INTERVAL;
        }

        // Don't allow intervals lower than the minimum.
        const minInterval = this.appProvider.isDesktop() ? CoreCronDelegate.DESKTOP_MIN_INTERVAL : CoreCronDelegate.MIN_INTERVAL,
            handlerInterval = this.handlers[name].getInterval();

        if (!handlerInterval) {
            return CoreCronDelegate.DEFAULT_INTERVAL;
        } else {
            return Math.max(minInterval, handlerInterval);
        }
    }

    /**
     * Get a handler's last execution ID.
     *
     * @param {string} name Handler's name.
     * @return {string} Handler's last execution ID.
     */
    protected getHandlerLastExecutionId(name: string): string {
        return 'last_execution_' + name;
    }

    /**
     * Get a handler's last execution time. If not defined, return 0.
     *
     * @param {string} name Handler's name.
     * @return {Promise<number>} Promise resolved with the handler's last execution time.
     */
    protected getHandlerLastExecutionTime(name: string): Promise<number> {
        const id = this.getHandlerLastExecutionId(name);

        return this.appDB.getRecord(this.CRON_TABLE, { id: id }).then((entry) => {
            const time = parseInt(entry.value, 10);

            return isNaN(time) ? 0 : time;
        }).catch(() => {
            return 0; // Not set, return 0.
        });
    }

    /**
     * Check if a handler uses network. Defaults to true.
     *
     * @param {string} name Handler's name.
     * @return {boolean} True if handler uses network or not defined, false otherwise.
     */
    protected handlerUsesNetwork(name: string): boolean {
        if (!this.handlers[name] || !this.handlers[name].usesNetwork) {
            // Invalid, return default.
            return true;
        }

        return this.handlers[name].usesNetwork();
    }

    /**
     * Check if there is any manual sync handler registered.
     *
     * @return {boolean} Whether it has at least 1 manual sync handler.
     */
    hasManualSyncHandlers(): boolean {
        for (const name in this.handlers) {
            if (this.isHandlerManualSync(name)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if there is any sync handler registered.
     *
     * @return {boolean} Whether it has at least 1 sync handler.
     */
    hasSyncHandlers(): boolean {
        for (const name in this.handlers) {
            if (this.isHandlerSync(name)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a handler can be manually synced. Defaults will use isSync instead.
     *
     * @param {string} name Handler's name.
     * @return {boolean} True if handler is a sync process and can be manually executed or not defined, false otherwise.
     */
    protected isHandlerManualSync(name: string): boolean {
        if (!this.handlers[name] || !this.handlers[name].canManualSync) {
            // Invalid, return default.
            return this.isHandlerSync(name);
        }

        return this.handlers[name].canManualSync();
    }

    /**
     * Check if a handler is a sync process. Defaults to true.
     *
     * @param {string} name Handler's name.
     * @return {boolean} True if handler is a sync process or not defined, false otherwise.
     */
    protected isHandlerSync(name: string): boolean {
        if (!this.handlers[name] || !this.handlers[name].isSync) {
            // Invalid, return default.
            return true;
        }

        return this.handlers[name].isSync();
    }

    /**
     * Register a handler to be executed every certain time.
     *
     * @param {CoreCronHandler} handler The handler to register.
     */
    register(handler: CoreCronHandler): void {
        if (!handler || !handler.name) {
            // Invalid handler.
            return;
        }
        if (typeof this.handlers[handler.name] != 'undefined') {
            this.logger.debug(`The cron handler '${handler.name}' is already registered.`);

            return;
        }

        this.logger.debug(`Register handler '${handler.name}' in cron.`);

        handler.running = false;
        this.handlers[handler.name] = handler;

        // Start the handler.
        this.startHandler(handler.name);
    }

    /**
     * Schedule a next execution for a handler.
     *
     * @param {string} name Name of the handler.
     * @param {number} [time] Time to the next execution. If not supplied it will be calculated using the last execution and
     *                        the handler's interval. This param should be used only if it's really necessary.
     */
    protected scheduleNextExecution(name: string, time?: number): void {
        if (!this.handlers[name]) {
            // Invalid handler.
            return;
        }
        if (this.handlers[name].timeout) {
            // There's already a pending timeout.
            return;
        }

        let promise;

        if (time) {
            promise = Promise.resolve(time);
        } else {
            // Get last execution time to check when do we need to execute it.
            promise = this.getHandlerLastExecutionTime(name).then((lastExecution) => {
                const interval = this.getHandlerInterval(name),
                    nextExecution = lastExecution + interval;

                return nextExecution - Date.now();
            });
        }

        promise.then((nextExecution) => {
            this.logger.debug(`Scheduling next execution of handler '${name}' in '${nextExecution}' ms`);
            if (nextExecution < 0) {
                nextExecution = 0; // Big negative numbers aren't executed immediately.
            }

            this.handlers[name].timeout = setTimeout(() => {
                delete this.handlers[name].timeout;
                this.checkAndExecuteHandler(name).catch(() => {
                    // Ignore errors.
                });
            }, nextExecution);
        });
    }

    /**
     * Set a handler's last execution time.
     *
     * @param {string} name Handler's name.
     * @param {number} time Time to set.
     * @return {Promise}    Promise resolved when the execution time is saved.
     */
    protected setHandlerLastExecutionTime(name: string, time: number): Promise<any> {
        const id = this.getHandlerLastExecutionId(name),
            entry = {
                id: id,
                value: time
            };

        return this.appDB.insertRecord(this.CRON_TABLE, entry);
    }

    /**
     * Start running a handler periodically.
     *
     * @param {string} name Name of the handler.
     */
    protected startHandler(name: string): void {
        if (!this.handlers[name]) {
            // Invalid handler.
            this.logger.debug(`Cannot start handler '${name}', is invalid.`);

            return;
        }

        if (this.handlers[name].running) {
            this.logger.debug(`Handler '${name}', is already running.`);

            return;
        }

        this.handlers[name].running = true;

        this.scheduleNextExecution(name);
    }

    /**
     * Start running periodically the handlers that use network.
     */
    startNetworkHandlers(): void {
        for (const name in this.handlers) {
            if (this.handlerUsesNetwork(name)) {
                this.startHandler(name);
            }
        }
    }

    /**
     * Stop running a handler periodically.
     *
     * @param {string} name Name of the handler.
     */
    protected stopHandler(name: string): void {
        if (!this.handlers[name]) {
            // Invalid handler.
            this.logger.debug(`Cannot stop handler '${name}', is invalid.`);

            return;
        }

        if (!this.handlers[name].running) {
            this.logger.debug(`Cannot stop handler '${name}', it's not running.`);

            return;
        }

        this.handlers[name].running = false;
        clearTimeout(this.handlers[name].timeout);
        delete this.handlers[name].timeout;
    }
}
