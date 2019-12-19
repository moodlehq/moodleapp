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
import { AddonModDataFieldHandler } from './fields-delegate';

/**
 * Default handler used when a field plugin doesn't have a specific implementation.
 */
@Injectable()
export class AddonModDataDefaultFieldHandler implements AddonModDataFieldHandler {
    name = 'AddonModDataDefaultFieldHandler';
    type = 'default';

    /**
     * Get field search data in the input data.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the search form.
     * @return With name and value of the data to be sent.
     */
    getFieldSearchData(field: any, inputData: any): any {
        return false;
    }

    /**
     * Get field edit data in the input data.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the edit form.
     * @return With name and value of the data to be sent.
     */
    getFieldEditData(field: any, inputData: any, originalFieldData: any): any {
        return false;
    }

    /**
     * Get field data in changed.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the edit form.
     * @param originalFieldData Original field entered data.
     * @return If the field has changes.
     */
    hasFieldDataChanged(field: any, inputData: any, originalFieldData: any): Promise<boolean> | boolean {
        return false;
    }

    /**
     * Get field edit files in the input data.
     *
     * @param field Defines the field..
     * @return With name and value of the data to be sent.
     */
    getFieldEditFiles(field: any, inputData: any, originalFieldData: any): any {
        return [];
    }

    /**
     * Check and get field requeriments.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the edit form.
     * @return String with the notification or false.
     */
    getFieldsNotifications(field: any, inputData: any): string | false {
        return false;
    }

    /**
     * Override field content data with offline submission.
     *
     * @param originalContent Original data to be overriden.
     * @param offlineContent Array with all the offline data to override.
     * @param offlineFiles Array with all the offline files in the field.
     * @return Data overriden
     */
    overrideData(originalContent: any, offlineContent: any, offlineFiles?: any): any {
        return originalContent;
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }
}
