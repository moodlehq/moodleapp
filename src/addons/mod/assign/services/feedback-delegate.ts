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

import { Injectable, Type, inject } from '@angular/core';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { AddonModAssignDefaultFeedbackHandler } from './handlers/default-feedback';
import {
    AddonModAssignAssign,
    AddonModAssignSubmission,
    AddonModAssignPlugin,
    AddonModAssignSavePluginData,
    AddonModAssignSubmissionFeedback,
} from './assign';
import { makeSingleton } from '@singletons';
import { CoreWSFile } from '@services/ws';
import { AddonModAssignSubmissionFormatted } from './assign-helper';
import { CoreFormFields } from '@singletons/form';
import type { IAddonModAssignFeedbackPluginComponent } from '@addons/mod/assign/classes/base-feedback-plugin-component';
import { CoreSites } from '@services/sites';
import { ADDON_MOD_ASSIGN_FEATURE_NAME } from '../constants';

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
     * @returns If the function is async, it should return a Promise resolved when done.
     * @deprecated since 5.0. Feedback drafts are not needed if you show form in the grading modal.
     */
    discardDraft?(assignId: number, userId: number, siteId?: string): void | Promise<void>;

    /**
     * Return the Component to use to display the plugin data.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param plugin The plugin object.
     * @returns The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent?(plugin: AddonModAssignPlugin): Type<IAddonModAssignFeedbackPluginComponent>
    | undefined
    | Promise<Type<IAddonModAssignFeedbackPluginComponent> | undefined>;

    /**
     * Return the draft saved data of the feedback plugin.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Data (or promise resolved with the data).
     * @deprecated since 5.0. Feedback drafts are not needed if you show form in the grading modal.
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
     * Check if the feedback data has changed for this plugin.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param inputData Data entered by the user for the feedback.
     * @param userId User ID of the submission.
     * @returns Boolean (or promise resolved with boolean): whether the data has changed.
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
     * @returns Boolean or promise resolved with boolean: whether the plugin has draft data.
     * @deprecated since 5.0. Feedback drafts are not needed if you show form in the grading modal.
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
     * @returns Promise resolved when done.
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
     * @param inputData Data entered in the feedback form.
     * @param siteId Site ID. If not defined, current site.
     * @returns If the function is async, it should return a Promise resolved when done.
     */
    prepareFeedbackData?(
        assignId: number,
        userId: number,
        plugin: AddonModAssignPlugin,
        pluginData: AddonModAssignSavePluginData,
        inputData: CoreFormFields,
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
     * @returns If the function is async, it should return a Promise resolved when done.
     * @deprecated since 5.0. Feedback drafts are not needed if you show form in the grading modal.
     */
    saveDraft?(
        assignId: number,
        userId: number,
        plugin: AddonModAssignPlugin,
        data: CoreFormFields,
        siteId?: string,
    ): void | Promise<void>;

    /**
     * Whether the plugin can contain filters in the feedback contents. If any of the field of the feedback uses
     * format_string or format_text in LMS, this function should return true.
     * Used to determine if the app needs to fetch unfiltered data when editing the feedback.
     *
     * @param assign The assignment.
     * @param submitId The submission ID.
     * @param feedback The feedback.
     * @param plugin The plugin object.
     * @returns Whether the submission can contain filters.
     */
    canContainFiltersWhenEditing?(
        assign: AddonModAssignAssign,
        submitId: number,
        feedback: AddonModAssignSubmissionFeedback,
        plugin: AddonModAssignPlugin,
    ): Promise<boolean>;
}

/**
 * Delegate to register plugins for assign feedback.
 */
@Injectable({ providedIn: 'root' })
export class AddonModAssignFeedbackDelegateService extends CoreDelegate<AddonModAssignFeedbackHandler> {

    protected handlerNameProperty = 'type';
    protected defaultHandler = inject(AddonModAssignDefaultFeedbackHandler);

    constructor() {
        super();
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return !(await CoreSites.isFeatureDisabled(ADDON_MOD_ASSIGN_FEATURE_NAME));
    }

    /**
     * Whether the plugin can contain filters in the feedback contents when editing the feedback.
     *
     * @param assign The assignment.
     * @param submitId The submission ID.
     * @param feedback The feedback.
     * @param plugin The plugin object.
     * @returns Whether the feedback can contain filters.
     */
    async canPluginContainFiltersWhenEditing(
        assign: AddonModAssignAssign,
        submitId: number,
        feedback: AddonModAssignSubmissionFeedback,
        plugin: AddonModAssignPlugin,
    ): Promise<boolean | undefined> {
        return await
            this.executeFunctionOnEnabled(plugin.type, 'canContainFiltersWhenEditing', [assign, submitId, feedback, plugin]);
    }

    /**
     * Discard the draft data of the feedback plugin.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param plugin The plugin object.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     * @deprecated since 5.0. Feedback drafts are not needed if you show form in the grading modal.
     */
    async discardPluginFeedbackData(
        assignId: number,
        userId: number,
        plugin: AddonModAssignPlugin,
        siteId?: string,
    ): Promise<void> {
        return this.executeFunctionOnEnabled(plugin.type, 'discardDraft', [assignId, userId, siteId]);
    }

    /**
     * Get the component to use for a certain feedback plugin.
     *
     * @param plugin The plugin object.
     * @returns Promise resolved with the component to use, undefined if not found.
     */
    async getComponentForPlugin(
        plugin: AddonModAssignPlugin,
    ): Promise<Type<IAddonModAssignFeedbackPluginComponent> | undefined> {
        return this.executeFunctionOnEnabled(plugin.type, 'getComponent', [plugin]);
    }

    /**
     * Return the draft saved data of the feedback plugin.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param plugin The plugin object.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the draft data.
     * @deprecated since 5.0. Feedback drafts are not needed if you show form in the grading modal.
     */
    async getPluginDraftData<T>(
        assignId: number,
        userId: number,
        plugin: AddonModAssignPlugin,
        siteId?: string,
    ): Promise<T | undefined> {
        return this.executeFunctionOnEnabled(plugin.type, 'getDraft', [assignId, userId, siteId]);
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
     * Get a readable name to use for a certain feedback plugin.
     *
     * @param plugin Plugin to get the name for.
     * @returns Human readable name.
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
     * @returns Promise resolved with true if data has changed, resolved with false otherwise.
     */
    async hasPluginDataChanged(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission | AddonModAssignSubmissionFormatted,
        plugin: AddonModAssignPlugin,
        inputData: CoreFormFields,
        userId: number,
    ): Promise<boolean | undefined> {
        return this.executeFunctionOnEnabled(
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
     * @returns Promise resolved with true if it has draft data.
     * @deprecated since 5.0. Feedback drafts are not needed if you show form in the grading modal.
     */
    async hasPluginDraftData(
        assignId: number,
        userId: number,
        plugin: AddonModAssignPlugin,
        siteId?: string,
    ): Promise<boolean | undefined> {
        return this.executeFunctionOnEnabled(plugin.type, 'hasDraftData', [assignId, userId, siteId]);
    }

    /**
     * Check if a feedback plugin is supported.
     *
     * @param pluginType Type of the plugin.
     * @returns Whether it's supported.
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
     * Prepare and add to pluginData the data to submit for a certain feedback plugin.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param plugin The plugin object.
     * @param pluginData Object where to store the data to send.
     * @param inputData Data entered in the feedback form.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when data has been gathered.
     */
    async preparePluginFeedbackData(
        assignId: number,
        userId: number,
        plugin: AddonModAssignPlugin,
        pluginData: AddonModAssignSavePluginData,
        inputData: CoreFormFields,
        siteId?: string,
    ): Promise<void> {

        return this.executeFunctionOnEnabled(
            plugin.type,
            'prepareFeedbackData',
            [assignId, userId, plugin, pluginData, inputData, siteId],
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
     * @returns Promise resolved when data has been saved.
     * @deprecated since 5.0. Feedback drafts are not needed if you show form in the grading modal.
     */
    async saveFeedbackDraft(
        assignId: number,
        userId: number,
        plugin: AddonModAssignPlugin,
        inputData: CoreFormFields,
        siteId?: string,
    ): Promise<void> {
        return this.executeFunctionOnEnabled(
            plugin.type,
            'saveDraft',
            [assignId, userId, plugin, inputData, siteId],
        );
    }

}
export const AddonModAssignFeedbackDelegate = makeSingleton(AddonModAssignFeedbackDelegateService);
