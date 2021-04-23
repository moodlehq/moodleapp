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
import { CoreWSFile } from '@services/ws';
import { Translate } from '@singletons';
import { AddonModAssignPlugin } from '../assign';
import { AddonModAssignFeedbackHandler } from '../feedback-delegate';

/**
 * Default handler used when a feedback plugin doesn't have a specific implementation.
 */
@Injectable({ providedIn: 'root' })
export class AddonModAssignDefaultFeedbackHandler implements AddonModAssignFeedbackHandler {

    name = 'AddonModAssignDefaultFeedbackHandler';
    type = 'default';

    /**
     * Discard the draft data of the feedback plugin.
     *
     * @return If the function is async, it should return a Promise resolved when done.
     */
    discardDraft(): void {
        // Nothing to do.
    }

    /**
     * Return the draft saved data of the feedback plugin.
     *
     * @return Data (or promise resolved with the data).
     */
    getDraft(): undefined {
        // Nothing to do.
        return;
    }

    /**
     * Get files used by this plugin.
     * The files returned by this function will be prefetched when the user prefetches the assign.
     *
     * @return The files (or promise resolved with the files).
     */
    getPluginFiles(): CoreWSFile[] {
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
        const translationId = 'addon.mod_assign_feedback_' + plugin.type + '.pluginname';
        const translation = Translate.instant(translationId);

        if (translationId != translation) {
            // Translation found, use it.
            return translation;
        }

        // Fallback to WS string.
        if (plugin.name) {
            return plugin.name;
        }

        return '';
    }

    /**
     * Check if the feedback data has changed for this plugin.
     *
     * @return Boolean (or promise resolved with boolean): whether the data has changed.
     */
    hasDataChanged(): boolean {
        return false;
    }

    /**
     * Check whether the plugin has draft data stored.
     *
     * @return Boolean or promise resolved with boolean: whether the plugin has draft data.
     */
    hasDraftData(): boolean {
        return false;
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Prefetch any required data for the plugin.
     * This should NOT prefetch files. Files to be prefetched should be returned by the getPluginFiles function.
     *
     * @return Promise resolved when done.
     */
    async prefetch(): Promise<void> {
        return;
    }

    /**
     * Prepare and add to pluginData the data to send to the server based on the draft data saved.
     *
     * @return If the function is async, it should return a Promise resolved when done.
     */
    prepareFeedbackData(): void {
        // Nothing to do.
    }

    /**
     * Save draft data of the feedback plugin.
     *
     * @return If the function is async, it should return a Promise resolved when done.
     */
    saveDraft(): void {
        // Nothing to do.
    }

}
