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

import { Injectable, Injector } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { AddonModAssignDefaultFeedbackHandler } from './default-feedback-handler';
import { AddonModAssignAssign, AddonModAssignSubmission, AddonModAssignPlugin } from './assign';

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
    discardDraft?(assignId: number, userId: number, siteId?: string): void | Promise<any>;

    /**
     * Return the Component to use to display the plugin data.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param injector Injector.
     * @param plugin The plugin object.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent?(injector: Injector, plugin: AddonModAssignPlugin): any | Promise<any>;

    /**
     * Return the draft saved data of the feedback plugin.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Data (or promise resolved with the data).
     */
    getDraft?(assignId: number, userId: number, siteId?: string): any | Promise<any>;

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
    getPluginFiles?(assign: AddonModAssignAssign, submission: AddonModAssignSubmission,
            plugin: AddonModAssignPlugin, siteId?: string): any[] | Promise<any[]>;

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
    hasDataChanged?(assign: AddonModAssignAssign, submission: AddonModAssignSubmission,
            plugin: AddonModAssignPlugin, inputData: any, userId: number): boolean | Promise<boolean>;

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
    prefetch?(assign: AddonModAssignAssign, submission: AddonModAssignSubmission,
            plugin: AddonModAssignPlugin, siteId?: string): Promise<any>;

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
    prepareFeedbackData?(assignId: number, userId: number, plugin: AddonModAssignPlugin, pluginData: any,
            siteId?: string): void | Promise<any>;

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
    saveDraft?(assignId: number, userId: number, plugin: AddonModAssignPlugin, data: any, siteId?: string)
            : void | Promise<any>;
}

/**
 * Delegate to register plugins for assign feedback.
 */
@Injectable()
export class AddonModAssignFeedbackDelegate extends CoreDelegate {

    protected handlerNameProperty = 'type';

    constructor(logger: CoreLoggerProvider, sitesProvider: CoreSitesProvider, eventsProvider: CoreEventsProvider,
            protected defaultHandler: AddonModAssignDefaultFeedbackHandler) {
        super('AddonModAssignFeedbackDelegate', logger, sitesProvider, eventsProvider);
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
    discardPluginFeedbackData(assignId: number, userId: number, plugin: AddonModAssignPlugin, siteId?: string)
            : Promise<any> {
        return Promise.resolve(this.executeFunctionOnEnabled(plugin.type, 'discardDraft', [assignId, userId, siteId]));
    }

    /**
     * Get the component to use for a certain feedback plugin.
     *
     * @param injector Injector.
     * @param plugin The plugin object.
     * @return Promise resolved with the component to use, undefined if not found.
     */
    getComponentForPlugin(injector: Injector, plugin: AddonModAssignPlugin): Promise<any> {
        return Promise.resolve(this.executeFunctionOnEnabled(plugin.type, 'getComponent', [injector, plugin]));
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
    getPluginDraftData(assignId: number, userId: number, plugin: AddonModAssignPlugin, siteId?: string)
            : Promise<any> {
        return Promise.resolve(this.executeFunctionOnEnabled(plugin.type, 'getDraft', [assignId, userId, siteId]));
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
    getPluginFiles(assign: AddonModAssignAssign, submission: AddonModAssignSubmission,
            plugin: AddonModAssignPlugin, siteId?: string): Promise<any[]> {
        return Promise.resolve(this.executeFunctionOnEnabled(plugin.type, 'getPluginFiles', [assign, submission, plugin, siteId]));
    }

    /**
     * Get a readable name to use for a certain feedback plugin.
     *
     * @param plugin Plugin to get the name for.
     * @return Human readable name.
     */
    getPluginName(plugin: AddonModAssignPlugin): string {
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
    hasPluginDataChanged(assign: AddonModAssignAssign, submission: AddonModAssignSubmission,
            plugin: AddonModAssignPlugin, inputData: any, userId: number): Promise<boolean> {
        return Promise.resolve(this.executeFunctionOnEnabled(plugin.type, 'hasDataChanged',
                [assign, submission, plugin, inputData, userId]));
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
    hasPluginDraftData(assignId: number, userId: number, plugin: AddonModAssignPlugin, siteId?: string)
            : Promise<boolean> {
        return Promise.resolve(this.executeFunctionOnEnabled(plugin.type, 'hasDraftData', [assignId, userId, siteId]));
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
    prefetch(assign: AddonModAssignAssign, submission: AddonModAssignSubmission, plugin: AddonModAssignPlugin,
            siteId?: string): Promise<any> {
        return Promise.resolve(this.executeFunctionOnEnabled(plugin.type, 'prefetch', [assign, submission, plugin, siteId]));
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
    preparePluginFeedbackData(assignId: number, userId: number, plugin: AddonModAssignPlugin, pluginData: any,
            siteId?: string): Promise<any> {

        return Promise.resolve(this.executeFunctionOnEnabled(plugin.type, 'prepareFeedbackData',
                [assignId, userId, plugin, pluginData, siteId]));
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
    saveFeedbackDraft(assignId: number, userId: number, plugin: AddonModAssignPlugin, inputData: any,
            siteId?: string): Promise<any> {
        return Promise.resolve(this.executeFunctionOnEnabled(plugin.type, 'saveDraft',
                [assignId, userId, plugin, inputData, siteId]));
    }
}
