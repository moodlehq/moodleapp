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
     * @inheritdoc
     */
    discardDraft(): void {
        // Nothing to do.
    }

    /**
     * @inheritdoc
     */
    getDraft(): undefined {
        // Nothing to do.
        return;
    }

    /**
     * @inheritdoc
     */
    getPluginFiles(): CoreWSFile[] {
        return [];
    }

    /**
     * @inheritdoc
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
     * @inheritdoc
     */
    hasDataChanged(): boolean {
        return false;
    }

    /**
     * @inheritdoc
     */
    hasDraftData(): boolean {
        return false;
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    async prefetch(): Promise<void> {
        return;
    }

    /**
     * @inheritdoc
     */
    prepareFeedbackData(): void {
        // Nothing to do.
    }

    /**
     * @inheritdoc
     */
    saveDraft(): void {
        // Nothing to do.
    }

}
