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
import {
    AddonModDataEntryField,
    AddonModDataField,
    AddonModDataSearchEntriesAdvancedFieldFormatted,
    AddonModDataSubfieldData,
} from '@addons/mod/data/services/data';
import { AddonModDataFieldHandler } from '@addons/mod/data/services/data-fields-delegate';
import { Injectable, Type } from '@angular/core';
import { CoreFormFields } from '@singletons/form';
import { makeSingleton, Translate } from '@singletons';
import { AddonModDataFieldCheckboxComponent } from '../component/checkbox';

/**
 * Handler for checkbox data field plugin.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataFieldCheckboxHandlerService implements AddonModDataFieldHandler {

    name = 'AddonModDataFieldCheckboxHandler';
    type = 'checkbox';

    /**
     * @inheritdoc
     */
    getComponent(): Type<unknown> {
        return AddonModDataFieldCheckboxComponent;
    }

    /**
     * @inheritdoc
     */
    getFieldSearchData(
        field: AddonModDataField,
        inputData: CoreFormFields<string[]>,
    ): AddonModDataSearchEntriesAdvancedFieldFormatted[] {

        const fieldName = 'f_' + field.id;
        const reqName = 'f_' + field.id + '_allreq';

        if (inputData[fieldName]) {
            const values: AddonModDataSearchEntriesAdvancedFieldFormatted[] = [];

            values.push({
                name: fieldName,
                value: inputData[fieldName],
            });

            if (inputData[reqName]) {
                values.push({
                    name: reqName,
                    value: true,
                });
            }

            return values;
        }

        return [];
    }

    /**
     * @inheritdoc
     */
    getFieldEditData(field: AddonModDataField, inputData: CoreFormFields<string[]>): AddonModDataSubfieldData[] {
        const fieldName = 'f_' + field.id;

        return [{
            fieldid: field.id,
            value: inputData[fieldName] || [],
        }];
    }

    /**
     * @inheritdoc
     */
    hasFieldDataChanged(
        field: AddonModDataField,
        inputData: CoreFormFields<string[]>,
        originalFieldData: AddonModDataEntryField,
    ): boolean {
        const fieldName = 'f_' + field.id;

        const content = originalFieldData?.content || '';

        return inputData[fieldName].join('##') != content;
    }

    /**
     * Check and get field requeriments.
     *
     * @param field Defines the field to be rendered.
     * @param inputData Data entered in the edit form.
     * @return String with the notification or false.
     */
    getFieldsNotifications(field: AddonModDataField, inputData: AddonModDataSubfieldData[]): string | undefined {
        if (field.required && (!inputData || !inputData.length || !inputData[0].value)) {
            return Translate.instant('addon.mod_data.errormustsupplyvalue');
        }
    }

    /**
     * @inheritdoc
     */
    overrideData(originalContent: AddonModDataEntryField, offlineContent: CoreFormFields<string[]>): AddonModDataEntryField {
        originalContent.content = (offlineContent[''] && offlineContent[''].join('##')) || '';

        return originalContent;
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

}
export const AddonModDataFieldCheckboxHandler = makeSingleton(AddonModDataFieldCheckboxHandlerService);
