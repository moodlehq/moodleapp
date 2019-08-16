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

import { Injectable, Injector } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { AddonModAssignDefaultSubmissionHandler } from './default-submission-handler';

/**
 * Interface that all submission handlers must implement.
 */
export interface AddonModAssignSubmissionHandler extends CoreDelegateHandler {

    /**
     * Name of the type of submission the handler supports. E.g. 'file'.
     * @type {string}
     */
    type: string;

    /**
     * Whether the plugin can be edited in offline for existing submissions. In general, this should return false if the
     * plugin uses Moodle filters. The reason is that the app only prefetches filtered data, and the user should edit
     * unfiltered data.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @return {boolean|Promise<boolean>} Boolean or promise resolved with boolean: whether it can be edited in offline.
     */
    canEditOffline?(assign: any, submission: any, plugin: any): boolean | Promise<boolean>;

    /**
     * Should clear temporary data for a cancelled submission.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {any} inputData Data entered by the user for the submission.
     */
    clearTmpData?(assign: any, submission: any, plugin: any, inputData: any): void;

    /**
     * This function will be called when the user wants to create a new submission based on the previous one.
     * It should add to pluginData the data to send to server based in the data in plugin (previous attempt).
     *
     * @param {any} assign The assignment.
     * @param {any} plugin The plugin object.
     * @param {any} pluginData Object where to store the data to send.
     * @param {number} [userId] User ID. If not defined, site's current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {void|Promise<any>} If the function is async, it should return a Promise resolved when done.
     */
    copySubmissionData?(assign: any, plugin: any, pluginData: any, userId?: number, siteId?: string): void | Promise<any>;

    /**
     * Delete any stored data for the plugin and submission.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {any} offlineData Offline data stored.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {void|Promise<any>} If the function is async, it should return a Promise resolved when done.
     */
    deleteOfflineData?(assign: any, submission: any, plugin: any, offlineData: any, siteId?: string): void | Promise<any>;

    /**
     * Return the Component to use to display the plugin data, either in read or in edit mode.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param {Injector} injector Injector.
     * @param {any} plugin The plugin object.
     * @param {boolean} [edit] Whether the user is editing.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent?(injector: Injector, plugin: any, edit?: boolean): any | Promise<any>;

    /**
     * Get files used by this plugin.
     * The files returned by this function will be prefetched when the user prefetches the assign.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {any[]|Promise<any[]>} The files (or promise resolved with the files).
     */
    getPluginFiles?(assign: any, submission: any, plugin: any, siteId?: string): any[] | Promise<any[]>;

    /**
     * Get a readable name to use for the plugin.
     *
     * @param {any} plugin The plugin object.
     * @return {string} The plugin name.
     */
    getPluginName?(plugin: any): string;

    /**
     * Get the size of data (in bytes) this plugin will send to copy a previous submission.
     *
     * @param {any} assign The assignment.
     * @param {any} plugin The plugin object.
     * @return {number|Promise<number>} The size (or promise resolved with size).
     */
    getSizeForCopy?(assign: any, plugin: any): number | Promise<number>;

    /**
     * Get the size of data (in bytes) this plugin will send to add or edit a submission.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {any} inputData Data entered by the user for the submission.
     * @return {number|Promise<number>} The size (or promise resolved with size).
     */
    getSizeForEdit?(assign: any, submission: any, plugin: any, inputData: any): number | Promise<number>;

    /**
     * Check if the submission data has changed for this plugin.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {any} inputData Data entered by the user for the submission.
     * @return {boolean|Promise<boolean>} Boolean (or promise resolved with boolean): whether the data has changed.
     */
    hasDataChanged?(assign: any, submission: any, plugin: any, inputData: any): boolean | Promise<boolean>;

    /**
     * Whether or not the handler is enabled for edit on a site level.
     *
     * @return {boolean|Promise<boolean>} Whether or not the handler is enabled for edit on a site level.
     */
    isEnabledForEdit?(): boolean | Promise<boolean>;

    /**
     * Prefetch any required data for the plugin.
     * This should NOT prefetch files. Files to be prefetched should be returned by the getPluginFiles function.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    prefetch?(assign: any, submission: any, plugin: any, siteId?: string): Promise<any>;

    /**
     * Prepare and add to pluginData the data to send to the server based on the input data.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {any} inputData Data entered by the user for the submission.
     * @param {any} pluginData Object where to store the data to send.
     * @param {boolean} [offline] Whether the user is editing in offline.
     * @param {number} [userId] User ID. If not defined, site's current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {void|Promise<any>} If the function is async, it should return a Promise resolved when done.
     */
    prepareSubmissionData?(assign: any, submission: any, plugin: any, inputData: any, pluginData: any, offline?: boolean,
        userId?: number, siteId?: string): void | Promise<any>;

    /**
     * Prepare and add to pluginData the data to send to the server based on the offline data stored.
     * This will be used when performing a synchronization.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {any} offlineData Offline data stored.
     * @param {any} pluginData Object where to store the data to send.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {void|Promise<any>} If the function is async, it should return a Promise resolved when done.
     */
    prepareSyncData?(assign: any, submission: any, plugin: any, offlineData: any, pluginData: any, siteId?: string)
        : void | Promise<any>;
}

/**
 * Delegate to register plugins for assign submission.
 */
@Injectable()
export class AddonModAssignSubmissionDelegate extends CoreDelegate {

    protected handlerNameProperty = 'type';

    constructor(logger: CoreLoggerProvider, sitesProvider: CoreSitesProvider, eventsProvider: CoreEventsProvider,
            protected defaultHandler: AddonModAssignDefaultSubmissionHandler) {
        super('AddonModAssignSubmissionDelegate', logger, sitesProvider, eventsProvider);
    }

    /**
     * Whether the plugin can be edited in offline for existing submissions.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @return {boolean|Promise<boolean>} Promise resolved with boolean: whether it can be edited in offline.
     */
    canPluginEditOffline(assign: any, submission: any, plugin: any): Promise<boolean> {
        return Promise.resolve(this.executeFunctionOnEnabled(plugin.type, 'canEditOffline', [assign, submission, plugin]));
    }

    /**
     * Clear some temporary data for a certain plugin because a submission was cancelled.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {any} inputData Data entered by the user for the submission.
     */
    clearTmpData(assign: any, submission: any, plugin: any, inputData: any): void {
        return this.executeFunctionOnEnabled(plugin.type, 'clearTmpData', [assign, submission, plugin, inputData]);
    }

    /**
     * Copy the data from last submitted attempt to the current submission for a certain plugin.
     *
     * @param {any} assign The assignment.
     * @param {any} plugin The plugin object.
     * @param {any} pluginData Object where to store the data to send.
     * @param {number} [userId] User ID. If not defined, site's current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data has been copied.
     */
    copyPluginSubmissionData(assign: any, plugin: any, pluginData: any, userId?: number, siteId?: string): void | Promise<any> {
        return Promise.resolve(this.executeFunctionOnEnabled(plugin.type, 'copySubmissionData',
                [assign, plugin, pluginData, userId, siteId]));
    }

    /**
     * Delete offline data stored for a certain submission and plugin.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {any} offlineData Offline data stored.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    deletePluginOfflineData(assign: any, submission: any, plugin: any, offlineData: any, siteId?: string): Promise<any> {
        return Promise.resolve(this.executeFunctionOnEnabled(plugin.type, 'deleteOfflineData',
                [assign, submission, plugin, offlineData, siteId]));
    }

    /**
     * Get the component to use for a certain submission plugin.
     *
     * @param {Injector} injector Injector.
     * @param {any} plugin The plugin object.
     * @param {boolean} [edit] Whether the user is editing.
     * @return {Promise<any>} Promise resolved with the component to use, undefined if not found.
     */
    getComponentForPlugin(injector: Injector, plugin: any, edit?: boolean): Promise<any> {
        return Promise.resolve(this.executeFunctionOnEnabled(plugin.type, 'getComponent', [injector, plugin, edit]));
    }

    /**
     * Get files used by this plugin.
     * The files returned by this function will be prefetched when the user prefetches the assign.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with the files.
     */
    getPluginFiles(assign: any, submission: any, plugin: any, siteId?: string): Promise<any[]> {
        return Promise.resolve(this.executeFunctionOnEnabled(plugin.type, 'getPluginFiles', [assign, submission, plugin, siteId]));
    }

    /**
     * Get a readable name to use for a certain submission plugin.
     *
     * @param {any} plugin Plugin to get the name for.
     * @return {string} Human readable name.
     */
    getPluginName(plugin: any): string {
        return this.executeFunctionOnEnabled(plugin.type, 'getPluginName', [plugin]);
    }

    /**
     * Get the size of data (in bytes) this plugin will send to copy a previous submission.
     *
     * @param {any} assign The assignment.
     * @param {any} plugin The plugin object.
     * @return {Promise<number>} Promise resolved with size.
     */
    getPluginSizeForCopy(assign: any, plugin: any): Promise<number> {
        return Promise.resolve(this.executeFunctionOnEnabled(plugin.type, 'getSizeForCopy', [assign, plugin]));
    }

    /**
     * Get the size of data (in bytes) this plugin will send to add or edit a submission.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {any} inputData Data entered by the user for the submission.
     * @return {Promise<number>} Promise resolved with size.
     */
    getPluginSizeForEdit(assign: any, submission: any, plugin: any, inputData: any): Promise<number> {
        return Promise.resolve(this.executeFunctionOnEnabled(plugin.type, 'getSizeForEdit',
                [assign, submission, plugin, inputData]));
    }

    /**
     * Check if the submission data has changed for a certain plugin.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {any} inputData Data entered by the user for the submission.
     * @return {Promise<boolean>} Promise resolved with true if data has changed, resolved with false otherwise.
     */
    hasPluginDataChanged(assign: any, submission: any, plugin: any, inputData: any): Promise<boolean> {
        return Promise.resolve(this.executeFunctionOnEnabled(plugin.type, 'hasDataChanged',
                [assign, submission, plugin, inputData]));
    }

    /**
     * Check if a submission plugin is supported.
     *
     * @param {string} pluginType Type of the plugin.
     * @return {boolean} Whether it's supported.
     */
    isPluginSupported(pluginType: string): boolean {
        return this.hasHandler(pluginType, true);
    }

    /**
     * Check if a submission plugin is supported for edit.
     *
     * @param {string} pluginType Type of the plugin.
     * @return {Promise<boolean>} Whether it's supported for edit.
     */
    isPluginSupportedForEdit(pluginType: string): Promise<boolean> {
        return Promise.resolve(this.executeFunctionOnEnabled(pluginType, 'isEnabledForEdit'));
    }

    /**
     * Prefetch any required data for a submission plugin.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    prefetch(assign: any, submission: any, plugin: any, siteId?: string): Promise<any> {
        return Promise.resolve(this.executeFunctionOnEnabled(plugin.type, 'prefetch', [assign, submission, plugin, siteId]));
    }

    /**
     * Prepare and add to pluginData the data to submit for a certain submission plugin.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {any} inputData Data entered by the user for the submission.
     * @param {any} pluginData Object where to store the data to send.
     * @param {boolean} [offline] Whether the user is editing in offline.
     * @param {number} [userId] User ID. If not defined, site's current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when data has been gathered.
     */
    preparePluginSubmissionData(assign: any, submission: any, plugin: any, inputData: any, pluginData: any, offline?: boolean,
            userId?: number, siteId?: string): Promise<any> {

        return Promise.resolve(this.executeFunctionOnEnabled(plugin.type, 'prepareSubmissionData',
                [assign, submission, plugin, inputData, pluginData, offline, userId, siteId]));
    }

    /**
     * Prepare and add to pluginData the data to send to server to synchronize an offline submission.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {any} offlineData Offline data stored.
     * @param {any} pluginData Object where to store the data to send.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when data has been gathered.
     */
    preparePluginSyncData(assign: any, submission: any, plugin: any, offlineData: any, pluginData: any, siteId?: string)
            : Promise<any> {

        return Promise.resolve(this.executeFunctionOnEnabled(plugin.type, 'prepareSyncData',
                [assign, submission, plugin, offlineData, pluginData, siteId]));
    }
}
