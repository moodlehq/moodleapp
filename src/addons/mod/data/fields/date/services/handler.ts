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
import { CoreTimeUtils } from '@services/utils/time';
import { makeSingleton, Translate } from '@singletons';
import { AddonModDataFieldDateComponent } from '../component/date';
import type { AddonModDataFieldPluginBaseComponent } from '@addons/mod/data/classes/base-field-plugin-component';

/**
 * Handler for date data field plugin.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataFieldDateHandlerService implements AddonModDataFieldHandler {

    name = 'AddonModDataFieldDateHandler';
    type = 'date';

    /**
     * @inheritdoc
     */
    getComponent(): Type<AddonModDataFieldPluginBaseComponent> {
        return AddonModDataFieldDateComponent;
    }

    /**
     * @inheritdoc
     */
    getFieldSearchData(
        field: AddonModDataField,
        inputData: CoreFormFields<string>,
    ): AddonModDataSearchEntriesAdvancedFieldFormatted[] {
        const fieldName = 'f_' + field.id;
        const enabledName = 'f_' + field.id + '_z';

        if (inputData[enabledName] && typeof inputData[fieldName] == 'string') {
            const date = inputData[fieldName].substring(0, 10).split('-');

            return [
                {
                    name: fieldName + '_y',
                    value: date[0],
                },
                {
                    name: fieldName + '_m',
                    value: date[1],
                },
                {
                    name: fieldName + '_d',
                    value: date[2],
                },
                {
                    name: enabledName,
                    value: 1,
                },
            ];
        }

        return [];
    }

    /**
     * @inheritdoc
     */
    getFieldEditData(field: AddonModDataField, inputData: CoreFormFields<string>): AddonModDataSubfieldData[] {
        const fieldName = 'f_' + field.id;

        if (typeof inputData[fieldName] != 'string') {
            return [];
        }

        const date = inputData[fieldName].substring(0, 10).split('-');

        return [
            {
                fieldid: field.id,
                subfield: 'year',
                value: date[0],
            },
            {
                fieldid: field.id,
                subfield: 'month',
                value: date[1],
            },
            {
                fieldid: field.id,
                subfield: 'day',
                value: date[2],
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
        const input = inputData[fieldName] && inputData[fieldName].substring(0, 10) || '';

        const content = (originalFieldData && originalFieldData?.content &&
                CoreTimeUtils.toDatetimeFormat(parseInt(originalFieldData.content, 10) * 1000).substring(0, 10)) || '';

        return input != content;
    }

    /**
     * @inheritdoc
     */
    getFieldsNotifications(field: AddonModDataField, inputData: AddonModDataSubfieldData[]): string | undefined {
        if (field.required &&
                (!inputData || inputData.length < 2 || !inputData[0].value || !inputData[1].value || !inputData[2].value)) {

            return Translate.instant('addon.mod_data.errormustsupplyvalue');
        }
    }

    /**
     * @inheritdoc
     */
    overrideData(originalContent: AddonModDataEntryField, offlineContent: CoreFormFields<string>): AddonModDataEntryField {
        if (offlineContent['day']) {
            let date = Date.UTC(
                parseInt(offlineContent['year'], 10),
                parseInt(offlineContent['month'], 10) - 1,
                parseInt(offlineContent['day'], 10),
            );
            date = Math.floor(date / 1000);

            originalContent.content = String(date) || '';
        }

        return originalContent;
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

}
export const AddonModDataFieldDateHandler = makeSingleton(AddonModDataFieldDateHandlerService);
