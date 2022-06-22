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
import { AddonModDataFieldLatlongComponent } from '../component/latlong';
import type { AddonModDataFieldPluginBaseComponent } from '@addons/mod/data/classes/base-field-plugin-component';

/**
 * Handler for latlong data field plugin.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataFieldLatlongHandlerService implements AddonModDataFieldHandler {

    name = 'AddonModDataFieldLatlongHandler';
    type = 'latlong';

    /**
     * @inheritdoc
     */
    getComponent(): Type<AddonModDataFieldPluginBaseComponent> {
        return AddonModDataFieldLatlongComponent;
    }

    /**
     * @inheritdoc
     */
    getFieldSearchData(
        field: AddonModDataField,
        inputData: CoreFormFields<string>,
    ): AddonModDataSearchEntriesAdvancedFieldFormatted[] {
        const fieldName = 'f_' + field.id;

        if (inputData[fieldName]) {
            return [{
                name: fieldName,
                value: inputData[fieldName],
            }];
        }

        return [];
    }

    /**
     * @inheritdoc
     */
    getFieldEditData(field: AddonModDataField, inputData: CoreFormFields<string>): AddonModDataSubfieldData[] {
        const fieldName = 'f_' + field.id;

        return [
            {
                fieldid: field.id,
                subfield: '0',
                value: inputData[fieldName + '_0'] || '',
            },
            {
                fieldid: field.id,
                subfield: '1',
                value: inputData[fieldName + '_1'] || '',
            },
        ];
    }

    /**
     * @inheritdoc
     */
    hasFieldDataChanged(
        field: AddonModDataField,
        inputData: CoreFormFields<string>,
        originalFieldData: AddonModDataEntryField,
    ): boolean {
        const fieldName = 'f_' + field.id;
        const lat = inputData[fieldName + '_0'] || '';
        const long = inputData[fieldName + '_1'] || '';
        const originalLat = (originalFieldData && originalFieldData.content) || '';
        const originalLong = (originalFieldData && originalFieldData.content1) || '';

        return lat != originalLat || long != originalLong;
    }

    /**
     * @inheritdoc
     */
    getFieldsNotifications(field: AddonModDataField, inputData: AddonModDataSubfieldData[]): string | undefined {
        let valueCount = 0;

        // The lat long class has two values that need to be checked.
        inputData.forEach((value) => {
            if (value.value !== undefined && value.value != '') {
                valueCount++;
            }
        });

        // If we get here then only one field has been filled in.
        if (valueCount == 1) {
            return Translate.instant('addon.mod_data.latlongboth');
        } else if (field.required && valueCount == 0) {
            return Translate.instant('addon.mod_data.errormustsupplyvalue');
        }
    }

    /**
     * @inheritdoc
     */
    overrideData(originalContent: AddonModDataEntryField, offlineContent: CoreFormFields<string>): AddonModDataEntryField {
        originalContent.content = offlineContent['0'] || '';
        originalContent.content1 = offlineContent['1'] || '';

        return originalContent;
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

}
export const AddonModDataFieldLatlongHandler = makeSingleton(AddonModDataFieldLatlongHandlerService);
