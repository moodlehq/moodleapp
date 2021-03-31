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

import { AddonModDataEntryField, AddonModDataField, AddonModDataSubfieldData } from '@addons/mod/data/services/data';
import { Injectable, Type } from '@angular/core';
import { CoreFormFields } from '@singletons/form';
import { makeSingleton, Translate } from '@singletons';
import { AddonModDataFieldTextHandlerService } from '../../text/services/handler';
import { AddonModDataFieldNumberComponent } from '../component/number';

/**
 * Handler for number data field plugin.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataFieldNumberHandlerService extends AddonModDataFieldTextHandlerService {

    name = 'AddonModDataFieldNumberHandler';
    type = 'number';

    /**
     * @inheritdoc
     */
    getComponent(): Type<unknown>{
        return AddonModDataFieldNumberComponent;
    }

    /**
     * @inheritdoc
     */
    hasFieldDataChanged(
        field: AddonModDataField,
        inputData: CoreFormFields,
        originalFieldData: AddonModDataEntryField,
    ): boolean {
        const fieldName = 'f_' + field.id;
        const input = inputData[fieldName] || '';
        const content = originalFieldData?.content || '';

        return input != content;
    }

    /**
     * @inheritdoc
     */
    getFieldsNotifications(field: AddonModDataField, inputData: AddonModDataSubfieldData[]): string | undefined {
        if (field.required && (!inputData || !inputData.length || inputData[0].value == '')) {
            return Translate.instant('addon.mod_data.errormustsupplyvalue');
        }
    }

}
export const AddonModDataFieldNumberHandler = makeSingleton(AddonModDataFieldNumberHandlerService);
