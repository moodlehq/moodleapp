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
import { CoreFormFields } from '@static/form';
import { Translate, makeSingleton } from '@singletons';
import { AddonModDataFieldTextHandlerService } from '../../text/services/handler';
import type { AddonModDataFieldPluginBaseComponent } from '@addons/mod/data/classes/base-field-plugin-component';

/**
 * Handler for url data field plugin.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataFieldUrlHandlerService extends AddonModDataFieldTextHandlerService {

    name = 'AddonModDataFieldUrlHandler';
    type = 'url';

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<AddonModDataFieldPluginBaseComponent>> {
        const { AddonModDataFieldUrlComponent } = await import('../component/url');

        return AddonModDataFieldUrlComponent;
    }

    /**
     * @inheritdoc
     */
    getFieldEditData(field: AddonModDataField, inputData: CoreFormFields<string>): AddonModDataSubfieldData[] {
        const fieldName = `f_${field.id}`;

        return [
            {
                fieldid: field.id,
                subfield: '0',
                value: (inputData[fieldName] && inputData[fieldName].trim()) || '',
            },
        ];
    }

    /**
     * @inheritdoc
     */
    getFieldsNotifications(field: AddonModDataField, inputData: AddonModDataSubfieldData[]): string | undefined {
        if (field.required && (!inputData || !inputData.length || !inputData[0].value)) {
            return Translate.instant('addon.mod_data.errormustsupplyvalue');
        }
    }

    /**
     * @inheritdoc
     */
    overrideData(originalContent: AddonModDataEntryField, offlineContent: CoreFormFields<string>): AddonModDataEntryField {
        originalContent.content = offlineContent['0'] || '';

        return originalContent;
    }

}
export const AddonModDataFieldUrlHandler = makeSingleton(AddonModDataFieldUrlHandlerService);
