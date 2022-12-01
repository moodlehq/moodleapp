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
import { AddonModAssignSubmissionHandler } from '../submission-delegate';

/**
 * Default handler used when a submission plugin doesn't have a specific implementation.
 */
@Injectable({ providedIn: 'root' })
export class AddonModAssignDefaultSubmissionHandler implements AddonModAssignSubmissionHandler {

    name = 'AddonModAssignBaseSubmissionHandler';
    type = 'base';

    /**
     * @inheritdoc
     */
    canEditOffline(): boolean | Promise<boolean> {
        return false;
    }

    /**
     * @inheritdoc
     */
    isEmpty(): boolean {
        return true;
    }

    /**
     * @inheritdoc
     */
    clearTmpData(): void {
        // Nothing to do.
    }

    /**
     * @inheritdoc
     */
    copySubmissionData(): void {
        // Nothing to do.
    }

    /**
     * @inheritdoc
     */
    deleteOfflineData(): void {
        // Nothing to do.
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
        const translationId = 'addon.mod_assign_submission_' + plugin.type + '.pluginname';
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
    getSizeForCopy(): number {
        return 0;
    }

    /**
     * @inheritdoc
     */
    getSizeForEdit(): number {
        return 0;
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
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    isEnabledForEdit(): boolean {
        return false;
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
    prepareSubmissionData(): void {
        // Nothing to do.
    }

    /**
     * @inheritdoc
     */
    prepareSyncData(): void {
        // Nothing to do.
    }

}
