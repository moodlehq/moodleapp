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

import { Injectable, Type } from '@angular/core';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { AddonModAssignDefaultSubmissionHandler } from './handlers/default-submission';
import { AddonModAssignAssign, AddonModAssignSubmission, AddonModAssignPlugin, AddonModAssignSavePluginData } from './assign';
import { makeSingleton } from '@singletons';
import { CoreWSFile } from '@services/ws';
import { AddonModAssignSubmissionsDBRecordFormatted } from './assign-offline';
import { CoreFormFields } from '@singletons/form';
import type { AddonModAssignSubmissionPluginBaseComponent } from '@addons/mod/assign/classes/base-submission-plugin-component';
import { CoreSites } from '@services/sites';
import { ADDON_MOD_ASSIGN_FEATURE_NAME } from '../constants';

/**
 * Interface that all submission handlers must implement.
 */
export interface AddonModAssignSubmissionHandler extends CoreDelegateHandler {

    /**
     * Name of the type of submission the handler supports. E.g. 'file'.
     */
    type: string;

    /**
     * Whether the plugin can be edited in offline for existing submissions. In general, this should return false if the
     * plugin uses Moodle filters. The reason is that the app only prefetches filtered data, and the user should edit
     * unfiltered data.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @returns Boolean or promise resolved with boolean: whether it can be edited in offline.
     * @deprecated since 5.0. Use canContainFiltersWhenEditing instead.
     */
    canEditOffline?(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
    ): boolean | Promise<boolean>;

    /**
     * Whether the plugin can contain filters in the submission contents and the field with filters can be edited.
     * If any of the editable field of the submission uses format_string or format_text in LMS, this function should return true.
     * Used to determine if the app needs to fetch unfiltered data when editing the submission.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @returns Whether the submission can contain filters.
     */
    canContainFiltersWhenEditing?(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
    ): Promise<boolean>;

    /**
     * Check if a plugin has no data.
     *
     * @param assign The assignment.
     * @param plugin The plugin object.
     * @returns Whether the plugin is empty.
     */
    isEmpty?(
        assign: AddonModAssignAssign,
        plugin: AddonModAssignPlugin,
    ): boolean;

    /**
     * Check if a plugin has no data in the edit form.
     *
     * @param assign The assignment.
     * @param plugin The plugin object.
     * @param inputData Data entered by the user for the submission.
     * @returns Whether the plugin is empty.
     */
    isEmptyForEdit?(
        assign: AddonModAssignAssign,
        plugin: AddonModAssignPlugin,
        inputData: CoreFormFields,
    ): boolean;

    /**
     * Should clear temporary data for a cancelled submission.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param inputData Data entered by the user for the submission.
     */
    clearTmpData?(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        inputData: CoreFormFields,
    ): void;

    /**
     * This function will be called when the user wants to create a new submission based on the previous one.
     * It should add to pluginData the data to send to server based in the data in plugin (previous attempt).
     *
     * @param assign The assignment.
     * @param plugin The plugin object.
     * @param pluginData Object where to store the data to send.
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns If the function is async, it should return a Promise resolved when done.
     */
    copySubmissionData?(
        assign: AddonModAssignAssign,
        plugin: AddonModAssignPlugin,
        pluginData: AddonModAssignSavePluginData,
        userId?: number,
        siteId?: string,
    ): void | Promise<void>;

    /**
     * Delete any stored data for the plugin and submission.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param offlineData Offline data stored.
     * @param siteId Site ID. If not defined, current site.
     * @returns If the function is async, it should return a Promise resolved when done.
     */
    deleteOfflineData?(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        offlineData: AddonModAssignSubmissionsDBRecordFormatted,
        siteId?: string,
    ): void | Promise<void>;

    /**
     * Return the Component to use to display the plugin data, either in read or in edit mode.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param plugin The plugin object.
     * @param edit Whether the user is editing.
     * @returns The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent?(
        plugin: AddonModAssignPlugin,
        edit?: boolean,
    ): Type<AddonModAssignSubmissionPluginBaseComponent>
    | undefined
    | Promise<Type<AddonModAssignSubmissionPluginBaseComponent> | undefined>;

    /**
     * Get files used by this plugin.
     * The files returned by this function will be prefetched when the user prefetches the assign.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param siteId Site ID. If not defined, current site.
     * @returns The files (or promise resolved with the files).
     */
    getPluginFiles?(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        siteId?: string,
    ): CoreWSFile[] | Promise<CoreWSFile[]>;

    /**
     * Get a readable name to use for the plugin.
     *
     * @param plugin The plugin object.
     * @returns The plugin name.
     */
    getPluginName?(plugin: AddonModAssignPlugin): string;

    /**
     * Get the size of data (in bytes) this plugin will send to copy a previous submission.
     *
     * @param assign The assignment.
     * @param plugin The plugin object.
     * @returns The size (or promise resolved with size).
     */
    getSizeForCopy?(
        assign: AddonModAssignAssign,
        plugin: AddonModAssignPlugin,
    ): number | Promise<number>;

    /**
     * Get the size of data (in bytes) this plugin will send to add or edit a submission.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param inputData Data entered by the user for the submission.
     * @returns The size (or promise resolved with size).
     */
    getSizeForEdit?(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        inputData: CoreFormFields,
    ): number | Promise<number>;

    /**
     * Check if the submission data has changed for this plugin.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param inputData Data entered by the user for the submission.
     * @returns Boolean (or promise resolved with boolean): whether the data has changed.
     */
    hasDataChanged?(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        inputData: CoreFormFields,
    ): Promise<boolean>;

    /**
     * Whether or not the handler is enabled for edit on a site level.
     *
     * @returns Whether or not the handler is enabled for edit on a site level.
     */
    isEnabledForEdit?(): boolean | Promise<boolean>;

    /**
     * Prefetch any required data for the plugin.
     * This should NOT prefetch files. Files to be prefetched should be returned by the getPluginFiles function.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    prefetch?(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        siteId?: string,
    ): Promise<void>;

    /**
     * Prepare and add to pluginData the data to send to the server based on the input data.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param inputData Data entered by the user for the submission.
     * @param pluginData Object where to store the data to send.
     * @param offline Whether the user is editing in offline.
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns If the function is async, it should return a Promise resolved when done.
     */
    prepareSubmissionData?(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        inputData: CoreFormFields,
        pluginData: AddonModAssignSavePluginData,
        offline?: boolean,
        userId?: number,
        siteId?: string,
    ): void | Promise<void>;

    /**
     * Prepare and add to pluginData the data to send to the server based on the offline data stored.
     * This will be used when performing a synchronization.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param offlineData Offline data stored.
     * @param pluginData Object where to store the data to send.
     * @param siteId Site ID. If not defined, current site.
     * @returns If the function is async, it should return a Promise resolved when done.
     */
    prepareSyncData?(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        offlineData: AddonModAssignSubmissionsDBRecordFormatted,
        pluginData: AddonModAssignSavePluginData,
        siteId?: string,
    ): void | Promise<void>;
}

/**
 * Delegate to register plugins for assign submission.
 */
@Injectable({ providedIn: 'root' })
export class AddonModAssignSubmissionDelegateService extends CoreDelegate<AddonModAssignSubmissionHandler> {

    protected handlerNameProperty = 'type';

    constructor(
        protected defaultHandler: AddonModAssignDefaultSubmissionHandler,
    ) {
        super('AddonModAssignSubmissionDelegate');
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return !(await CoreSites.isFeatureDisabled(ADDON_MOD_ASSIGN_FEATURE_NAME));
    }

    /**
     * Whether the plugin can contain filters in the submission contents.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @returns Whether the submission can contain filters.
     */
    async canPluginContainFiltersWhenEditing(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
    ): Promise<boolean | undefined> {
        const handler = this.getHandler(plugin.type);

        // eslint-disable-next-line deprecation/deprecation
        if (handler && !handler.canContainFiltersWhenEditing && handler.canEditOffline) {
            // Plugin implements the old callback but not the new one. Use the old one.
            // eslint-disable-next-line deprecation/deprecation
            const canEditOffline = await handler.canEditOffline(assign, submission, plugin);

            // If cannot edit offline, assume it can contain filters.
            return !canEditOffline;
        }

        return this.executeFunctionOnEnabled(plugin.type, 'canContainFiltersWhenEditing', [assign, submission, plugin]);
    }

    /**
     * Clear some temporary data for a certain plugin because a submission was cancelled.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param inputData Data entered by the user for the submission.
     */
    clearTmpData(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        inputData: CoreFormFields,
    ): void {
        this.executeFunctionOnEnabled(plugin.type, 'clearTmpData', [assign, submission, plugin, inputData]);
    }

    /**
     * Copy the data from last submitted attempt to the current submission for a certain plugin.
     *
     * @param assign The assignment.
     * @param plugin The plugin object.
     * @param pluginData Object where to store the data to send.
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data has been copied.
     */
    async copyPluginSubmissionData(
        assign: AddonModAssignAssign,
        plugin: AddonModAssignPlugin,
        pluginData: AddonModAssignSavePluginData,
        userId?: number,
        siteId?: string,
    ): Promise<void | undefined> {
        return this.executeFunctionOnEnabled(
            plugin.type,
            'copySubmissionData',
            [assign, plugin, pluginData, userId, siteId],
        );
    }

    /**
     * Delete offline data stored for a certain submission and plugin.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param offlineData Offline data stored.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async deletePluginOfflineData(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        offlineData: AddonModAssignSubmissionsDBRecordFormatted,
        siteId?: string,
    ): Promise<void> {
        return this.executeFunctionOnEnabled(
            plugin.type,
            'deleteOfflineData',
            [assign, submission, plugin, offlineData, siteId],
        );
    }

    /**
     * Get the component to use for a certain submission plugin.
     *
     * @param plugin The plugin object.
     * @param edit Whether the user is editing.
     * @returns Promise resolved with the component to use, undefined if not found.
     */
    async getComponentForPlugin(
        plugin: AddonModAssignPlugin,
        edit?: boolean,
    ): Promise<Type<AddonModAssignSubmissionPluginBaseComponent> | undefined> {
        return this.executeFunctionOnEnabled(plugin.type, 'getComponent', [plugin, edit]);
    }

    /**
     * Get files used by this plugin.
     * The files returned by this function will be prefetched when the user prefetches the assign.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the files.
     */
    async getPluginFiles(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        siteId?: string,
    ): Promise<CoreWSFile[]> {
        const files: CoreWSFile[] | undefined =
            await this.executeFunctionOnEnabled(plugin.type, 'getPluginFiles', [assign, submission, plugin, siteId]);

        return files || [];
    }

    /**
     * Get a readable name to use for a certain submission plugin.
     *
     * @param plugin Plugin to get the name for.
     * @returns Human readable name.
     */
    getPluginName(plugin: AddonModAssignPlugin): string | undefined {
        return this.executeFunctionOnEnabled(plugin.type, 'getPluginName', [plugin]);
    }

    /**
     * Get the size of data (in bytes) this plugin will send to copy a previous submission.
     *
     * @param assign The assignment.
     * @param plugin The plugin object.
     * @returns Promise resolved with size.
     */
    async getPluginSizeForCopy(assign: AddonModAssignAssign, plugin: AddonModAssignPlugin): Promise<number | undefined> {
        return this.executeFunctionOnEnabled(plugin.type, 'getSizeForCopy', [assign, plugin]);
    }

    /**
     * Get the size of data (in bytes) this plugin will send to add or edit a submission.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param inputData Data entered by the user for the submission.
     * @returns Promise resolved with size.
     */
    async getPluginSizeForEdit(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        inputData: CoreFormFields,
    ): Promise<number | undefined> {
        return this.executeFunctionOnEnabled(
            plugin.type,
            'getSizeForEdit',
            [assign, submission, plugin, inputData],
        );
    }

    /**
     * Check if the submission data has changed for a certain plugin.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param inputData Data entered by the user for the submission.
     * @returns Promise resolved with true if data has changed, resolved with false otherwise.
     */
    async hasPluginDataChanged(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        inputData: CoreFormFields,
    ): Promise<boolean | undefined> {
        return this.executeFunctionOnEnabled(
            plugin.type,
            'hasDataChanged',
            [assign, submission, plugin, inputData],
        );
    }

    /**
     * Check if a submission plugin is supported.
     *
     * @param pluginType Type of the plugin.
     * @returns Whether it's supported.
     */
    isPluginSupported(pluginType: string): boolean {
        return this.hasHandler(pluginType, true);
    }

    /**
     * Check if a submission plugin is supported for edit.
     *
     * @param pluginType Type of the plugin.
     * @returns Whether it's supported for edit.
     */
    async isPluginSupportedForEdit(pluginType: string): Promise<boolean | undefined> {
        return this.executeFunctionOnEnabled(pluginType, 'isEnabledForEdit');
    }

    /**
     * Check if a plugin has no data.
     *
     * @param assign The assignment.
     * @param plugin The plugin object.
     * @returns Whether the plugin is empty.
     */
    isPluginEmpty(assign: AddonModAssignAssign, plugin: AddonModAssignPlugin): boolean | undefined {
        return this.executeFunctionOnEnabled(plugin.type, 'isEmpty', [assign, plugin]);
    }

    /**
     * Check if a plugin has no data in the edit form
     *
     * @param assign The assignment.
     * @param plugin The plugin object.
     * @param inputData Data entered in the submission form.
     * @returns Whether the plugin is empty.
     */
    isPluginEmptyForEdit(
        assign: AddonModAssignAssign,
        plugin: AddonModAssignPlugin,
        inputData: CoreFormFields,
    ): boolean | undefined {
        return this.executeFunctionOnEnabled(plugin.type, 'isEmptyForEdit', [assign, plugin, inputData]);
    }

    /**
     * Prefetch any required data for a submission plugin.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async prefetch(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        siteId?: string,
    ): Promise<void> {
        return this.executeFunctionOnEnabled(plugin.type, 'prefetch', [assign, submission, plugin, siteId]);
    }

    /**
     * Prepare and add to pluginData the data to submit for a certain submission plugin.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param inputData Data entered by the user for the submission.
     * @param pluginData Object where to store the data to send.
     * @param offline Whether the user is editing in offline.
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when data has been gathered.
     */
    async preparePluginSubmissionData(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        inputData: CoreFormFields,
        pluginData: AddonModAssignSavePluginData,
        offline?: boolean,
        userId?: number,
        siteId?: string,
    ): Promise<void | undefined> {

        return this.executeFunctionOnEnabled(
            plugin.type,
            'prepareSubmissionData',
            [assign, submission, plugin, inputData, pluginData, offline, userId, siteId],
        );
    }

    /**
     * Prepare and add to pluginData the data to send to server to synchronize an offline submission.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param offlineData Offline data stored.
     * @param pluginData Object where to store the data to send.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when data has been gathered.
     */
    async preparePluginSyncData(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        offlineData: AddonModAssignSubmissionsDBRecordFormatted,
        pluginData: AddonModAssignSavePluginData,
        siteId?: string,
    ): Promise<void> {

        return this.executeFunctionOnEnabled(
            plugin.type,
            'prepareSyncData',
            [assign, submission, plugin, offlineData, pluginData, siteId],
        );
    }

}
export const AddonModAssignSubmissionDelegate = makeSingleton(AddonModAssignSubmissionDelegateService);
