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

import { Injector, Injectable } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { AddonModDataDefaultFieldHandler } from './default-field-handler';

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
     * @param injector Injector.
     * @param field The field object.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent?(injector: Injector, plugin: any): any | Promise<any>;

    /**
     * Get field search data in the input data.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the search form.
     * @return With name and value of the data to be sent.
     */
    getFieldSearchData?(field: any, inputData: any): any;

    /**
     * Get field edit data in the input data.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the edit form.
     * @return With name and value of the data to be sent.
     */
    getFieldEditData?(field: any, inputData: any, originalFieldData: any): any;

    /**
     * Get field data in changed.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the edit form.
     * @param originalFieldData Original field entered data.
     * @return If the field has changes.
     */
    hasFieldDataChanged?(field: any, inputData: any, originalFieldData: any): Promise<boolean> | boolean;

    /**
     * Get field edit files in the input data.
     *
     * @param field Defines the field..
     * @return With name and value of the data to be sent.
     */
    getFieldEditFiles?(field: any, inputData: any, originalFieldData: any): any;

    /**
     * Check and get field requeriments.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the edit form.
     * @return String with the notification or false.
     */
    getFieldsNotifications?(field: any, inputData: any): string | false;

    /**
     * Override field content data with offline submission.
     *
     * @param originalContent Original data to be overriden.
     * @param offlineContent Array with all the offline data to override.
     * @param offlineFiles Array with all the offline files in the field.
     * @return Data overriden
     */
    overrideData?(originalContent: any, offlineContent: any, offlineFiles?: any): any;
}

/**
 * Delegate to register database fields handlers.
 */
@Injectable()
export class AddonModDataFieldsDelegate extends CoreDelegate {

    protected handlerNameProperty = 'type';

    constructor(logger: CoreLoggerProvider, sitesProvider: CoreSitesProvider, eventsProvider: CoreEventsProvider,
            protected utils: CoreUtilsProvider, protected defaultHandler: AddonModDataDefaultFieldHandler) {
        super('AddonModDataFieldsDelegate', logger, sitesProvider, eventsProvider);
    }

    /**
     * Get the component to use for a certain field field.
     *
     * @param injector Injector.
     * @param field The field object.
     * @return Promise resolved with the component to use, undefined if not found.
     */
    getComponentForField(injector: Injector, field: any): Promise<any> {
        return Promise.resolve(this.executeFunctionOnEnabled(field.type, 'getComponent', [injector, field]));
    }

    /**
     * Get database data in the input data to search.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the search form.
     * @return Name and data field.
     */
    getFieldSearchData(field: any, inputData: any): any {
        return this.executeFunctionOnEnabled(field.type, 'getFieldSearchData', [field, inputData]);
    }

    /**
     * Get database data in the input data to add or update entry.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the search form.
     * @param originalFieldData Original field entered data.
     * @return Name and data field.
     */
    getFieldEditData(field: any, inputData: any, originalFieldData: any): any {
        return this.executeFunctionOnEnabled(field.type, 'getFieldEditData', [field, inputData, originalFieldData]);
    }

    /**
     * Get database data in the input files to add or update entry.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the search form.
     * @param originalFieldData Original field entered data.
     * @return Name and data field.
     */
    getFieldEditFiles(field: any, inputData: any, originalFieldData: any): any {
        return this.executeFunctionOnEnabled(field.type, 'getFieldEditFiles', [field, inputData, originalFieldData]);
    }

    /**
     * Check and get field requeriments.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the edit form.
     * @return String with the notification or false.
     */
    getFieldsNotifications(field: any, inputData: any): string {
        return this.executeFunctionOnEnabled(field.type, 'getFieldsNotifications', [field, inputData]);
    }

    /**
     * Check if field type manage files or not.
     *
     * @param field Defines the field to be checked.
     * @return If the field type manages files.
     */
    hasFiles(field: any): boolean {
        return this.hasFunction(field.type, 'getFieldEditFiles');
    }

    /**
     * Check if the data has changed for a certain field.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the search form.
     * @param originalFieldData Original field entered data.
     * @return Promise rejected if has changed, resolved if no changes.
     */
    hasFieldDataChanged(field: any, inputData: any, originalFieldData: any): Promise<void> {
        return Promise.resolve(this.executeFunctionOnEnabled(field.type, 'hasFieldDataChanged',
                [field, inputData, originalFieldData])).then((result) => {
            return result ? Promise.reject(null) : Promise.resolve();
        });
    }

    /**
     * Check if a field plugin is supported.
     *
     * @param pluginType Type of the plugin.
     * @return True if supported, false otherwise.
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
     * @return Data overriden
     */
    overrideData(field: any, originalContent: any, offlineContent: any, offlineFiles?: any): any {
        originalContent = originalContent || {};

        if (!offlineContent) {
            return originalContent;
        }

        return this.executeFunctionOnEnabled(field.type, 'overrideData', [originalContent, offlineContent, offlineFiles]);
    }

}
