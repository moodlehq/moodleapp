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

import { Injectable } from '@angular/core';

import { CoreAppDB } from '@services/app-db';
import { CoreNetwork } from '@services/network';
import { CoreConfig } from '@services/config';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreConstants } from '@/core/constants';
import { CoreError } from '@classes/errors/error';

import { makeSingleton, Translate } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { APP_SCHEMA, CRON_TABLE_NAME, CronDBEntry } from '@services/database/cron';
import { asyncInstance } from '../utils/async-instance';
import { CoreDatabaseTable } from '@classes/database/database-table';
import { CoreDatabaseCachingStrategy, CoreDatabaseTableProxy } from '@classes/database/database-table-proxy';

/*
 * Service to handle cron processes. The registered processes will be executed every certain time.
*/
@Injectable({ providedIn: 'root' })
export class CoreCronDelegateService {

    // Constants.
    static readonly DEFAULT_INTERVAL = 3600000; // Default interval is 1 hour.
    static readonly MIN_INTERVAL = 240000; // Minimum interval is 4 minutes.
    static readonly MAX_TIME_PROCESS = 120000; // Max time a process can block the queue. Defaults to 2 minutes.

    protected logger: CoreLogger;
    protected handlers: { [s: string]: CoreCronHandler } = {};
    protected queuePromise: Promise<void> = Promise.resolve();
    protected table = asyncInstance<CoreDatabaseTable<CronDBEntry>>();

    constructor() {
        this.logger = CoreLogger.getInstance('CoreCronDelegate');
    }

    /**
     * Initialize database.
     */
    async initializeDatabase(): Promise<void> {
        await CoreAppDB.createTablesFromSchema(APP_SCHEMA);

        const table = new CoreDatabaseTableProxy<CronDBEntry>(
            { cachingStrategy: CoreDatabaseCachingStrategy.Eager },
            CoreAppDB.getDB(),
            CRON_TABLE_NAME,
        );

        await table.initialize();

        this.table.setInstance(table);
    }

    /**
     * Try to execute a handler. It will schedule the next execution once done.
     * If the handler cannot be executed or it fails, it will be re-executed after mmCoreCronMinInterval.
     *
     * @param name Name of the handler.
     * @param force Wether the execution is forced (manual sync).
     * @param siteId Site ID. If not defined, all sites.
     * @returns Promise resolved if handler is executed successfully, rejected otherwise.
     */
    protected async checkAndExecuteHandler(name: string, force?: boolean, siteId?: string): Promise<void> {
        if (!this.handlers[name] || !this.handlers[name].execute) {
            // Invalid handler.
            this.logger.debug(`Cannot execute cron job because is invalid: ${name}`);

            throw new CoreError(
                Translate.instant('core.errorsomethingwrong') + '<br>' + Translate.instant('core.errorsitesupport'),
            );
        }

        const usesNetwork = this.handlerUsesNetwork(name);
        const isSync = !force && this.isHandlerSync(name);

        if (usesNetwork && !CoreNetwork.isOnline()) {
            // Offline, stop executing.
            this.logger.debug(`Cron job failed because your device is not connected to the internet: ${name}`);
            this.stopHandler(name);

            throw new CoreError(Translate.instant('core.settings.cannotsyncoffline'));
        }

        if (isSync) {
            // Check network connection.
            const syncOnlyOnWifi = await CoreConfig.get(CoreConstants.SETTINGS_SYNC_ONLY_ON_WIFI, false);

            if (syncOnlyOnWifi && !CoreNetwork.isWifi()) {
                // Cannot execute in this network connection, retry soon.
                this.logger.debug(`Cron job failed because your device has a limited internet connection: ${name}`);
                this.scheduleNextExecution(name, CoreCronDelegateService.MIN_INTERVAL);

                throw new CoreError(Translate.instant('core.settings.cannotsyncwithoutwifi'));
            }
        }

        // Add the execution to the queue.
        this.queuePromise = CorePromiseUtils.ignoreErrors(this.queuePromise).then(async () => {
            try {
                await this.executeHandler(name, force, siteId);

                this.logger.debug(`Cron job '${name}' was successfully executed.`);

                await CorePromiseUtils.ignoreErrors(this.setHandlerLastExecutionTime(name, Date.now()));

                this.scheduleNextExecution(name);

                return;
            } catch (error) {
                // Handler call failed. Retry soon.
                this.logger.error(`Cron job '${name}' failed.`, error);
                this.scheduleNextExecution(name, CoreCronDelegateService.MIN_INTERVAL);

                throw error;
            }
        });

        return this.queuePromise;
    }

    /**
     * Run a handler, cancelling the execution if it takes more than MAX_TIME_PROCESS.
     *
     * @param name Name of the handler.
     * @param force Wether the execution is forced (manual sync).
     * @param siteId Site ID. If not defined, all sites.
     * @returns Promise resolved when the handler finishes or reaches max time, rejected if it fails.
     */
    protected async executeHandler(name: string, force?: boolean, siteId?: string): Promise<void> {
        this.logger.debug('Executing handler: ' + name);

        try {
            // Wrap the call in Promise.resolve to make sure it's a promise.
            const promise = Promise.resolve(this.handlers[name].execute?.(siteId, force));

            await CorePromiseUtils.timeoutPromise(promise, CoreCronDelegateService.MAX_TIME_PROCESS);
        } catch (error) {
            if (error.timeout) {
                // The handler took too long. Resolve because we don't want to retry soon.
                this.logger.debug(`Resolving execution of handler '${name}' because it took too long.`);

                return;
            }

            throw error;
        }
    }

    /**
     * Force execution of synchronization cron tasks without waiting for the scheduled time.
     * Please notice that some tasks may not be executed depending on the network connection and sync settings.
     *
     * @param siteId Site ID. If not defined, all sites.
     * @returns Promise resolved if all handlers are executed successfully, rejected otherwise.
     */
    async forceSyncExecution(siteId?: string): Promise<void> {
        const promises: Promise<void>[] = [];

        for (const name in this.handlers) {
            if (this.isHandlerManualSync(name)) {
                // Now force the execution of the handler.
                promises.push(this.forceCronHandlerExecution(name, siteId));
            }
        }

        await CorePromiseUtils.allPromises(promises);
    }

    /**
     * Force execution of a cron tasks without waiting for the scheduled time.
     * Please notice that some tasks may not be executed depending on the network connection and sync settings.
     *
     * @param name Name of the handler.
     * @param siteId Site ID. If not defined, all sites.
     * @returns Promise resolved if handler has been executed successfully, rejected otherwise.
     */
    forceCronHandlerExecution(name: string, siteId?: string): Promise<void> {
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
     * @param name Handler's name.
     * @returns Handler's interval.
     */
    protected async getHandlerInterval(name: string): Promise<number> {
        if (this.handlers[name] === undefined) {
            // Invalid, return default.
            return CoreCronDelegateService.DEFAULT_INTERVAL;
        }

        // Don't allow intervals lower than the minimum.
        const handlerInterval = await this.handlers[name].getInterval?.();

        if (!handlerInterval) {
            return CoreCronDelegateService.DEFAULT_INTERVAL;
        }

        const minInterval = CoreCronDelegateService.MIN_INTERVAL;

        return Math.max(minInterval, handlerInterval);
    }

    /**
     * Get a handler's last execution ID.
     *
     * @param name Handler's name.
     * @returns Handler's last execution ID.
     */
    protected getHandlerLastExecutionId(name: string): string {
        return 'last_execution_' + name;
    }

    /**
     * Get a handler's last execution time. If not defined, return 0.
     *
     * @param name Handler's name.
     * @returns Promise resolved with the handler's last execution time.
     */
    protected async getHandlerLastExecutionTime(name: string): Promise<number> {
        const id = this.getHandlerLastExecutionId(name);

        try {
            const entry = await this.table.getOneByPrimaryKey({ id });

            const time = Number(entry.value);

            return isNaN(time) ? 0 : time;
        } catch {
            return 0; // Not set, return 0.
        }
    }

    /**
     * Check if a handler uses network. Defaults to true.
     *
     * @param name Handler's name.
     * @returns True if handler uses network or not defined, false otherwise.
     */
    protected handlerUsesNetwork(name: string): boolean {
        return this.handlers[name]?.usesNetwork?.() ?? true;
    }

    /**
     * Check if there is any manual sync handler registered.
     *
     * @returns Whether it has at least 1 manual sync handler.
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
     * @returns Whether it has at least 1 sync handler.
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
     * @param name Handler's name.
     * @returns True if handler is a sync process and can be manually executed or not defined, false otherwise.
     */
    protected isHandlerManualSync(name: string): boolean {
        return this.handlers[name]?.canManualSync?.() ?? this.isHandlerSync(name);
    }

    /**
     * Check if a handler is a sync process. Defaults to true.
     *
     * @param name Handler's name.
     * @returns True if handler is a sync process or not defined, false otherwise.
     */
    protected isHandlerSync(name: string): boolean {
        return this.handlers[name]?.isSync?.() ?? true;
    }

    /**
     * Register a handler to be executed every certain time.
     *
     * @param handler The handler to register.
     */
    register(handler: CoreCronHandler): void {
        if (!handler || !handler.name) {
            // Invalid handler.
            return;
        }
        if (this.handlers[handler.name] !== undefined) {
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
     * @param name Name of the handler.
     * @param timeToNextExecution Time (in milliseconds). If not supplied it will be calculated.
     * @returns Promise resolved when done.
     */
    protected async scheduleNextExecution(name: string, timeToNextExecution?: number): Promise<void> {
        if (!this.handlers[name]) {
            // Invalid handler.
            return;
        }
        if (this.handlers[name].timeout) {
            // There's already a pending timeout.
            return;
        }

        if (!timeToNextExecution) {
            // Get last execution time to check when do we need to execute it.
            const lastExecution = await this.getHandlerLastExecutionTime(name);
            const interval = await this.getHandlerInterval(name);

            timeToNextExecution = lastExecution + interval - Date.now();
        }

        this.logger.debug(`Scheduling next execution of handler '${name}' in '${timeToNextExecution}' ms`);
        if (timeToNextExecution < 0) {
            timeToNextExecution = 0; // Big negative numbers aren't executed immediately.
        }

        this.handlers[name].timeout = window.setTimeout(() => {
            delete this.handlers[name].timeout;
            CorePromiseUtils.ignoreErrors(this.checkAndExecuteHandler(name));
        }, timeToNextExecution);
    }

    /**
     * Set a handler's last execution time.
     *
     * @param name Handler's name.
     * @param time Time to set.
     * @returns Promise resolved when the execution time is saved.
     */
    protected async setHandlerLastExecutionTime(name: string, time: number): Promise<void> {
        const id = this.getHandlerLastExecutionId(name);
        const entry = {
            id,
            value: time,
        };

        await this.table.insert(entry);
    }

    /**
     * Start running a handler periodically.
     *
     * @param name Name of the handler.
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
     * @param name Name of the handler.
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

export const CoreCronDelegate = makeSingleton(CoreCronDelegateService);

/**
 * Interface that all cron handlers must implement.
 */
export interface CoreCronHandler {
    /**
     * A name to identify the handler.
     */
    name: string;

    /**
     * Whether the handler is running. Used internally by the provider, there's no need to set it.
     */
    running?: boolean;

    /**
     * Timeout ID for the handler scheduling. Used internally by the provider, there's no need to set it.
     */
    timeout?: number;

    /**
     * Returns handler's interval in milliseconds. Defaults to CoreCronDelegateService.DEFAULT_INTERVAL.
     * The minumum interval is CoreCronDelegateService.MIN_INTERVAL (4 minutes).
     *
     * @returns Interval time (in milliseconds).
     */
    getInterval?(): number | Promise<number>;

    /**
     * Check whether the process uses network or not. True if not defined.
     *
     * @returns Whether the process uses network or not
     */
    usesNetwork?(): boolean;

    /**
     * Check whether it's a synchronization process or not. True if not defined.
     *
     * @returns Whether it's a synchronization process or not.
     */
    isSync?(): boolean;

    /**
     * Check whether the sync can be executed manually. Call isSync if not defined.
     *
     * @returns Whether the sync can be executed manually.
     */
    canManualSync?(): boolean;

    /**
     * Execute the process.
     *
     * @param siteId ID of the site affected. If not defined, all sites.
     * @param force Determines if it's a forced execution.
     * @returns Promise resolved when done. If the promise is rejected, this function will be called again often,
     *         it shouldn't be abused.
     */
    execute?(siteId?: string, force?: boolean): Promise<void>;
}
