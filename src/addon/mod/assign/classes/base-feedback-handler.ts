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

import { Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AddonModAssignFeedbackHandler } from '../providers/feedback-delegate';
import { AddonModAssignAssign, AddonModAssignSubmission, AddonModAssignPlugin } from '../providers/assign';

/**
 * Base handler for feedback plugins.
 *
 * This class is needed because parent classes cannot have @Injectable in Angular v6, so the default handler cannot be a
 * parent class.
 */
export class AddonModAssignBaseFeedbackHandler implements AddonModAssignFeedbackHandler {
    name = 'AddonModAssignBaseFeedbackHandler';
    type = 'base';

    constructor(protected translate: TranslateService) { }

    /**
     * Discard the draft data of the feedback plugin.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param siteId Site ID. If not defined, current site.
     * @return If the function is async, it should return a Promise resolved when done.
     */
    discardDraft(assignId: number, userId: number, siteId?: string): void | Promise<any> {
        // Nothing to do.
    }

    /**
     * Return the Component to use to display the plugin data.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param injector Injector.
     * @param plugin The plugin object.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector, plugin: AddonModAssignPlugin): any | Promise<any> {
        // Nothing to do.
    }

    /**
     * Return the draft saved data of the feedback plugin.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Data (or promise resolved with the data).
     */
    getDraft(assignId: number, userId: number, siteId?: string): any | Promise<any> {
        // Nothing to do.
    }

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
    getPluginFiles(assign: AddonModAssignAssign, submission: AddonModAssignSubmission,
            plugin: AddonModAssignPlugin, siteId?: string): any[] | Promise<any[]> {
        return [];
    }

    /**
     * Get a readable name to use for the plugin.
     *
     * @param plugin The plugin object.
     * @return The plugin name.
     */
    getPluginName(plugin: AddonModAssignPlugin): string {
        // Check if there's a translated string for the plugin.
        const translationId = 'addon.mod_assign_feedback_' + plugin.type + '.pluginname',
            translation = this.translate.instant(translationId);

        if (translationId != translation) {
            // Translation found, use it.
            return translation;
        }

        // Fallback to WS string.
        if (plugin.name) {
            return plugin.name;
        }
    }

    /**
     * Check if the feedback data has changed for this plugin.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param inputData Data entered by the user for the feedback.
     * @return Boolean (or promise resolved with boolean): whether the data has changed.
     */
    hasDataChanged(assign: AddonModAssignAssign, submission: AddonModAssignSubmission,
            plugin: AddonModAssignPlugin, inputData: any, userId: number): boolean | Promise<boolean> {
        return false;
    }

    /**
     * Check whether the plugin has draft data stored.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Boolean or promise resolved with boolean: whether the plugin has draft data.
     */
    hasDraftData(assignId: number, userId: number, siteId?: string): boolean | Promise<boolean> {
        return false;
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

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
    prefetch(assign: AddonModAssignAssign, submission: AddonModAssignSubmission,
            plugin: AddonModAssignPlugin, siteId?: string): Promise<any> {
        return Promise.resolve();
    }

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
    prepareFeedbackData(assignId: number, userId: number, plugin: AddonModAssignPlugin, pluginData: any,
            siteId?: string): void | Promise<any> {
        // Nothing to do.
    }

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
    saveDraft(assignId: number, userId: number, plugin: AddonModAssignPlugin, data: any, siteId?: string)
            : void | Promise<any> {
        // Nothing to do.
    }
}
