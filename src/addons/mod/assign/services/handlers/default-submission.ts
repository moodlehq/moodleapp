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
import { AddonModAssignAssign, AddonModAssignPlugin, AddonModAssignSavePluginData, AddonModAssignSubmission } from '../assign';
import { AddonModAssignSubmissionHandler } from '../submission-delegate';
import { CoreFormFields } from '@singletons/form';
import { AddonModAssignSubmissionsDBRecordFormatted } from '../assign-offline';

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
    canEditOffline(
        assign: AddonModAssignAssign, // eslint-disable-line @typescript-eslint/no-unused-vars
        submission: AddonModAssignSubmission, // eslint-disable-line @typescript-eslint/no-unused-vars
        plugin: AddonModAssignPlugin, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): boolean | Promise<boolean> {
        return false;
    }

    /**
     * @inheritdoc
     */
    isEmpty(
        assign: AddonModAssignAssign, // eslint-disable-line @typescript-eslint/no-unused-vars
        plugin: AddonModAssignPlugin, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): boolean {
        return true;
    }

    /**
     * @inheritdoc
     */
   isEmptyForEdit(
       assign: AddonModAssignAssign, // eslint-disable-line @typescript-eslint/no-unused-vars
       plugin: AddonModAssignPlugin, // eslint-disable-line @typescript-eslint/no-unused-vars
       inputData: CoreFormFields, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): boolean {
        return true;
    }

    /**
     * @inheritdoc
     */
    clearTmpData(
        assign: AddonModAssignAssign, // eslint-disable-line @typescript-eslint/no-unused-vars
        submission: AddonModAssignSubmission, // eslint-disable-line @typescript-eslint/no-unused-vars
        plugin: AddonModAssignPlugin, // eslint-disable-line @typescript-eslint/no-unused-vars
        inputData: CoreFormFields, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): void {
        // Nothing to do.
    }

    /**
     * @inheritdoc
     */
    copySubmissionData(
        assign: AddonModAssignAssign, // eslint-disable-line @typescript-eslint/no-unused-vars
        plugin: AddonModAssignPlugin, // eslint-disable-line @typescript-eslint/no-unused-vars
        pluginData: AddonModAssignSavePluginData, // eslint-disable-line @typescript-eslint/no-unused-vars
        userId?: number, // eslint-disable-line @typescript-eslint/no-unused-vars
        siteId?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): void | Promise<void> {
        // Nothing to do.
    }

    /**
     * @inheritdoc
     */
    deleteOfflineData(
        assign: AddonModAssignAssign, // eslint-disable-line @typescript-eslint/no-unused-vars
        submission: AddonModAssignSubmission, // eslint-disable-line @typescript-eslint/no-unused-vars
        plugin: AddonModAssignPlugin, // eslint-disable-line @typescript-eslint/no-unused-vars
        offlineData: AddonModAssignSubmissionsDBRecordFormatted, // eslint-disable-line @typescript-eslint/no-unused-vars
        siteId?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): void | Promise<void> {
        // Nothing to do.
    }

    /**
     * @inheritdoc
     */
    getPluginFiles(
        assign: AddonModAssignAssign, // eslint-disable-line @typescript-eslint/no-unused-vars
        submission: AddonModAssignSubmission, // eslint-disable-line @typescript-eslint/no-unused-vars
        plugin: AddonModAssignPlugin, // eslint-disable-line @typescript-eslint/no-unused-vars
        siteId?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
        ): CoreWSFile[] | Promise<CoreWSFile[]> {
        return [];
    }

    /**
     * @inheritdoc
     */
    getPluginName(plugin: AddonModAssignPlugin): string {
        // Check if there's a translated string for the plugin.
        const translationId = `addon.mod_assign_submission_${plugin.type}.pluginname`;
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
    getSizeForCopy(
        assign: AddonModAssignAssign, // eslint-disable-line @typescript-eslint/no-unused-vars
        plugin: AddonModAssignPlugin, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): number | Promise<number> {
        return 0;
    }

    /**
     * @inheritdoc
     */
    getSizeForEdit(
        assign: AddonModAssignAssign, // eslint-disable-line @typescript-eslint/no-unused-vars
        submission: AddonModAssignSubmission, // eslint-disable-line @typescript-eslint/no-unused-vars
        plugin: AddonModAssignPlugin, // eslint-disable-line @typescript-eslint/no-unused-vars
        inputData: CoreFormFields, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): number | Promise<number> {
        return 0;
    }

    /**
     * @inheritdoc
     */
    async hasDataChanged(
        assign: AddonModAssignAssign, // eslint-disable-line @typescript-eslint/no-unused-vars
        submission: AddonModAssignSubmission, // eslint-disable-line @typescript-eslint/no-unused-vars
        plugin: AddonModAssignPlugin, // eslint-disable-line @typescript-eslint/no-unused-vars
        inputData: CoreFormFields, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): Promise<boolean> {
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
    isEnabledForEdit(): boolean | Promise<boolean> {
        return false;
    }

    /**
     * @inheritdoc
     */
    async prefetch(
        assign: AddonModAssignAssign, // eslint-disable-line @typescript-eslint/no-unused-vars
        submission: AddonModAssignSubmission, // eslint-disable-line @typescript-eslint/no-unused-vars
        plugin: AddonModAssignPlugin, // eslint-disable-line @typescript-eslint/no-unused-vars
        siteId?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): Promise<void> {
        return;
    }

    /**
     * @inheritdoc
     */
    prepareSubmissionData(
        assign: AddonModAssignAssign, // eslint-disable-line @typescript-eslint/no-unused-vars
        submission: AddonModAssignSubmission, // eslint-disable-line @typescript-eslint/no-unused-vars
        plugin: AddonModAssignPlugin, // eslint-disable-line @typescript-eslint/no-unused-vars
        inputData: CoreFormFields, // eslint-disable-line @typescript-eslint/no-unused-vars
        pluginData: AddonModAssignSavePluginData, // eslint-disable-line @typescript-eslint/no-unused-vars
        offline?: boolean, // eslint-disable-line @typescript-eslint/no-unused-vars
        userId?: number, // eslint-disable-line @typescript-eslint/no-unused-vars
        siteId?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): void | Promise<void> {
        // Nothing to do.
    }

    /**
     * @inheritdoc
     */
    prepareSyncData(
        assign: AddonModAssignAssign, // eslint-disable-line @typescript-eslint/no-unused-vars
        submission: AddonModAssignSubmission, // eslint-disable-line @typescript-eslint/no-unused-vars
        plugin: AddonModAssignPlugin, // eslint-disable-line @typescript-eslint/no-unused-vars
        offlineData: AddonModAssignSubmissionsDBRecordFormatted, // eslint-disable-line @typescript-eslint/no-unused-vars
        pluginData: AddonModAssignSavePluginData, // eslint-disable-line @typescript-eslint/no-unused-vars
        siteId?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): void | Promise<void> {
        // Nothing to do.
    }

}
