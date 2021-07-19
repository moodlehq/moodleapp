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
import { AddonModAssignDefaultFeedbackHandler } from './handlers/default-feedback';
import { AddonModAssignAssign, AddonModAssignSubmission, AddonModAssignPlugin, AddonModAssignSavePluginData } from './assign';
import { makeSingleton } from '@singletons';
import { CoreWSFile } from '@services/ws';
import { AddonModAssignSubmissionFormatted } from './assign-helper';
import { CoreFormFields } from '@singletons/form';

/**
 * Interface that all feedback handlers must implement.
 */
export interface AddonModAssignFeedbackHandler extends CoreDelegateHandler {

    /**
     * Name of the type of feedback the handler supports. E.g. 'file'.
     */
    type: string;

    /**
     * Discard the draft data of the feedback plugin.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param siteId Site ID. If not defined, current site.
     * @return If the function is async, it should return a Promise resolved when done.
     */
    discardDraft?(assignId: number, userId: number, siteId?: string): void | Promise<void>;

    /**
     * Return the Component to use to display the plugin data.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param plugin The plugin object.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent?(plugin: AddonModAssignPlugin): Type<unknown> | undefined | Promise<Type<unknown> | undefined>;

    /**
     * Return the draft saved data of the feedback plugin.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Data (or promise resolved with the data).
     */
    getDraft?(
        assignId: number,
        userId: number,
        siteId?: string,
    ): CoreFormFields | Promise<CoreFormFields | undefined> | undefined;

    /**
     * Get files used by this plugin.
     * The files returned by this function will be prefetched when the user prefetches the assign.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param siteId Site ID. If not defined, current site.
     * @return The files (or promise resolved with the files).
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
     * @return The plugin name.
     */
    getPluginName?(plugin: AddonModAssignPlugin): string;

    /**
     * Check if the feedback data has changed for this plugin.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param inputData Data entered by the user for the feedback.
     * @param userId User ID of the submission.
     * @return Boolean (or promise resolved with boolean): whether the data has changed.
     */
    hasDataChanged?(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        inputData: CoreFormFields,
        userId: number,
    ): boolean | Promise<boolean>;

    /**
     * Check whether the plugin has draft data stored.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Boolean or promise resolved with boolean: whether the plugin has draft data.
     */
    hasDraftData?(assignId: number, userId: number, siteId?: string): boolean | Promise<boolean>;

    /**
     * Prefetch any required data for the plugin.
     * This should NOT prefetch files. Files to be prefetched should be returned by the getPluginFiles function.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    prefetch?(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        siteId?: string,
    ): Promise<void>;

    /**
     * Prepare and add to pluginData the data to send to the server based on the draft data saved.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param plugin The plugin object.
     * @param pluginData Object where to store the data to send.
     * @param siteId Site ID. If not defined, current site.
     * @return If the function is async, it should return a Promise resolved when done.
     */
    prepareFeedbackData?(
        assignId: number,
        userId: number,
        plugin: AddonModAssignPlugin,
        pluginData: AddonModAssignSavePluginData,
        siteId?: string,
    ): void | Promise<void>;

    /**
     * Save draft data of the feedback plugin.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param plugin The plugin object.
     * @param data The data to save.
     * @param siteId Site ID. If not defined, current site.
     * @return If the function is async, it should return a Promise resolved when done.
     */
    saveDraft?(
        assignId: number,
        userId: number,
        plugin: AddonModAssignPlugin,
        data: CoreFormFields,
        siteId?: string,
    ): void | Promise<void>;
}

/**
 * Delegate to register plugins for assign feedback.
 */
@Injectable({ providedIn: 'root' })
export class AddonModAssignFeedbackDelegateService extends CoreDelegate<AddonModAssignFeedbackHandler> {

    protected handlerNameProperty = 'type';

    constructor(
        protected defaultHandler: AddonModAssignDefaultFeedbackHandler,
    ) {
        super('AddonModAssignFeedbackDelegate', true);
    }

    /**
     * Discard the draft data of the feedback plugin.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param plugin The plugin object.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async discardPluginFeedbackData(
        assignId: number,
        userId: number,
        plugin: AddonModAssignPlugin,
        siteId?: string,
    ): Promise<void> {
        return await this.executeFunctionOnEnabled(plugin.type, 'discardDraft', [assignId, userId, siteId]);
    }

    /**
     * Get the component to use for a certain feedback plugin.
     *
     * @param plugin The plugin object.
     * @return Promise resolved with the component to use, undefined if not found.
     */
    async getComponentForPlugin(plugin: AddonModAssignPlugin): Promise<Type<unknown> | undefined> {
        return await this.executeFunctionOnEnabled(plugin.type, 'getComponent', [plugin]);
    }

    /**
     * Return the draft saved data of the feedback plugin.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param plugin The plugin object.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the draft data.
     */
    async getPluginDraftData<T>(
        assignId: number,
        userId: number,
        plugin: AddonModAssignPlugin,
        siteId?: string,
    ): Promise<T | undefined> {
        return await this.executeFunctionOnEnabled(plugin.type, 'getDraft', [assignId, userId, siteId]);
    }

    /**
     * Get files used by this plugin.
     * The files returned by this function will be prefetched when the user prefetches the assign.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the files.
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
     * Get a readable name to use for a certain feedback plugin.
     *
     * @param plugin Plugin to get the name for.
     * @return Human readable name.
     */
    getPluginName(plugin: AddonModAssignPlugin): string | undefined {
        return this.executeFunctionOnEnabled(plugin.type, 'getPluginName', [plugin]);
    }

    /**
     * Check if the feedback data has changed for a certain plugin.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param inputData Data entered by the user for the feedback.
     * @param userId User ID of the submission.
     * @return Promise resolved with true if data has changed, resolved with false otherwise.
     */
    async hasPluginDataChanged(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission | AddonModAssignSubmissionFormatted,
        plugin: AddonModAssignPlugin,
        inputData: CoreFormFields,
        userId: number,
    ): Promise<boolean | undefined> {
        return await this.executeFunctionOnEnabled(
            plugin.type,
            'hasDataChanged',
            [assign, submission, plugin, inputData, userId],
        );
    }

    /**
     * Check whether the plugin has draft data stored.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param plugin The plugin object.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if it has draft data.
     */
    async hasPluginDraftData(
        assignId: number,
        userId: number,
        plugin: AddonModAssignPlugin,
        siteId?: string,
    ): Promise<boolean | undefined> {
        return await this.executeFunctionOnEnabled(plugin.type, 'hasDraftData', [assignId, userId, siteId]);
    }

    /**
     * Check if a feedback plugin is supported.
     *
     * @param pluginType Type of the plugin.
     * @return Whether it's supported.
     */
    isPluginSupported(pluginType: string): boolean {
        return this.hasHandler(pluginType, true);
    }

    /**
     * Prefetch any required data for a feedback plugin.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async prefetch(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        siteId?: string,
    ): Promise<void> {
        return await this.executeFunctionOnEnabled(plugin.type, 'prefetch', [assign, submission, plugin, siteId]);
    }

    /**
     * Prepare and add to pluginData the data to submit for a certain feedback plugin.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param plugin The plugin object.
     * @param pluginData Object where to store the data to send.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when data has been gathered.
     */
    async preparePluginFeedbackData(
        assignId: number,
        userId: number,
        plugin: AddonModAssignPlugin,
        pluginData: AddonModAssignSavePluginData,
        siteId?: string,
    ): Promise<void> {

        return await this.executeFunctionOnEnabled(
            plugin.type,
            'prepareFeedbackData',
            [assignId, userId, plugin, pluginData, siteId],
        );
    }

    /**
     * Save draft data of the feedback plugin.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param plugin The plugin object.
     * @param inputData Data to save.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when data has been saved.
     */
    async saveFeedbackDraft(
        assignId: number,
        userId: number,
        plugin: AddonModAssignPlugin,
        inputData: CoreFormFields,
        siteId?: string,
    ): Promise<void> {
        return await this.executeFunctionOnEnabled(
            plugin.type,
            'saveDraft',
            [assignId, userId, plugin, inputData, siteId],
        );
    }

}
export const AddonModAssignFeedbackDelegate = makeSingleton(AddonModAssignFeedbackDelegateService);
