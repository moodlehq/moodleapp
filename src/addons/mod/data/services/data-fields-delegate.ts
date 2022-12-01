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
import { AddonModDataDefaultFieldHandler } from './handlers/default-field';
import { makeSingleton } from '@singletons';
import { AddonModDataEntryField,
    AddonModDataField,
    AddonModDataSearchEntriesAdvancedFieldFormatted,
    AddonModDataSubfieldData,
} from './data';
import { CoreFormFields } from '@singletons/form';
import { FileEntry } from '@ionic-native/file/ngx';
import { CoreFileEntry } from '@services/file-helper';
import type { AddonModDataFieldPluginBaseComponent } from '@addons/mod/data/classes/base-field-plugin-component';

/**
 * Interface that all fields handlers must implement.
 */
export interface AddonModDataFieldHandler extends CoreDelegateHandler {

    /**
     * Name of the type of data field the handler supports. E.g. 'checkbox'.
     */
    type: string;

    /**
     * Return the Component to use to display the plugin data.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param field The field object.
     * @returns The component to use, undefined if not found.
     */
    getComponent?(plugin: AddonModDataField): Type<AddonModDataFieldPluginBaseComponent> | undefined;

    /**
     * Get field search data in the input data.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the search form.
     * @returns With name and value of the data to be sent.
     */
    getFieldSearchData?(
        field: AddonModDataField,
        inputData: CoreFormFields,
    ): AddonModDataSearchEntriesAdvancedFieldFormatted[];

    /**
     * Get field edit data in the input data.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the edit form.
     * @returns With name and value of the data to be sent.
     */
    getFieldEditData?(
        field: AddonModDataField,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputData: CoreFormFields<any>,
        originalFieldData: AddonModDataEntryField,
    ): AddonModDataSubfieldData[];

    /**
     * Get field data in changed.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the edit form.
     * @param originalFieldData Original field entered data.
     * @returns If the field has changes.
     */
    hasFieldDataChanged?(
        field: AddonModDataField,
        inputData: CoreFormFields,
        originalFieldData: AddonModDataEntryField,
    ): boolean;

    /**
     * Get field edit files in the input data.
     *
     * @param field Defines the field..
     * @returns With name and value of the data to be sent.
     */
    getFieldEditFiles?(
        field: AddonModDataField,
        inputData: CoreFormFields,
        originalFieldData: AddonModDataEntryField,
    ): CoreFileEntry[];

    /**
     * Check and get field requeriments.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the edit form.
     * @returns String with the notification or false.
     */
    getFieldsNotifications?(field: AddonModDataField, inputData: AddonModDataSubfieldData[]): string | undefined;

    /**
     * Override field content data with offline submission.
     *
     * @param originalContent Original data to be overriden.
     * @param offlineContent Array with all the offline data to override.
     * @param offlineFiles Array with all the offline files in the field.
     * @returns Data overriden
     */
    overrideData?(
        originalContent: AddonModDataEntryField,
        offlineContent: CoreFormFields,
        offlineFiles?: FileEntry[],
    ): AddonModDataEntryField;
}

/**
 * Delegate to register database fields handlers.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataFieldsDelegateService extends CoreDelegate<AddonModDataFieldHandler> {

    protected handlerNameProperty = 'type';

    constructor(
        protected defaultHandler: AddonModDataDefaultFieldHandler,
    ) {
        super('AddonModDataFieldsDelegate', true);
    }

    /**
     * Get the component to use for a certain field field.
     *
     * @param field The field object.
     * @returns Promise resolved with the component to use, undefined if not found.
     */
    getComponentForField(field: AddonModDataField): Promise<Type<AddonModDataFieldPluginBaseComponent> | undefined> {
        return Promise.resolve(this.executeFunctionOnEnabled(field.type, 'getComponent', [field]));
    }

    /**
     * Get database data in the input data to search.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the search form.
     * @returns Name and data field.
     */
    getFieldSearchData(field: AddonModDataField, inputData: CoreFormFields): AddonModDataSearchEntriesAdvancedFieldFormatted[] {
        return this.executeFunctionOnEnabled(field.type, 'getFieldSearchData', [field, inputData]) || [];
    }

    /**
     * Get database data in the input data to add or update entry.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the search form.
     * @param originalFieldData Original field entered data.
     * @returns Name and data field.
     */
    getFieldEditData(
        field: AddonModDataField,
        inputData: CoreFormFields,
        originalFieldData: AddonModDataEntryField,
    ): AddonModDataSubfieldData[] {
        return this.executeFunctionOnEnabled(field.type, 'getFieldEditData', [field, inputData, originalFieldData]) || [];
    }

    /**
     * Get database data in the input files to add or update entry.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the search form.
     * @param originalFieldData Original field entered data.
     * @returns Name and data field.
     */
    getFieldEditFiles(
        field: AddonModDataField,
        inputData: CoreFormFields,
        originalFieldData: CoreFormFields,
    ): CoreFileEntry[] {
        return this.executeFunctionOnEnabled(field.type, 'getFieldEditFiles', [field, inputData, originalFieldData]) || [];
    }

    /**
     * Check and get field requeriments.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the edit form.
     * @returns String with the notification or false.
     */
    getFieldsNotifications(field: AddonModDataField, inputData: AddonModDataSubfieldData[]): string | undefined {
        return this.executeFunctionOnEnabled(field.type, 'getFieldsNotifications', [field, inputData]);
    }

    /**
     * Check if field type manage files or not.
     *
     * @param field Defines the field to be checked.
     * @returns If the field type manages files.
     */
    hasFiles(field: AddonModDataField): boolean {
        return this.hasFunction(field.type, 'getFieldEditFiles');
    }

    /**
     * Check if the data has changed for a certain field.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the search form.
     * @param originalFieldData Original field entered data.
     * @returns If the field has changes.
     */
    hasFieldDataChanged(
        field: AddonModDataField,
        inputData: CoreFormFields,
        originalFieldData: CoreFormFields,
    ): boolean {
        return !!this.executeFunctionOnEnabled(
            field.type,
            'hasFieldDataChanged',
            [field, inputData, originalFieldData],
        );
    }

    /**
     * Check if a field plugin is supported.
     *
     * @param pluginType Type of the plugin.
     * @returns True if supported, false otherwise.
     */
    isPluginSupported(pluginType: string): boolean {
        return this.hasHandler(pluginType, true);
    }

    /**
     * Override field content data with offline submission.
     *
     * @param field Defines the field to be rendered.
     * @param originalContent Original data to be overriden.
     * @param offlineContent Array with all the offline data to override.
     * @param offlineFiles Array with all the offline files in the field.
     * @returns Data overriden
     */
    overrideData(
        field: AddonModDataField,
        originalContent: AddonModDataEntryField,
        offlineContent: CoreFormFields,
        offlineFiles?: FileEntry[],
    ): AddonModDataEntryField {
        originalContent = originalContent || {};

        if (!offlineContent) {
            return originalContent;
        }

        return this.executeFunctionOnEnabled(field.type, 'overrideData', [originalContent, offlineContent, offlineFiles]) ||
            originalContent;
    }

}
export const AddonModDataFieldsDelegate = makeSingleton(AddonModDataFieldsDelegateService);
