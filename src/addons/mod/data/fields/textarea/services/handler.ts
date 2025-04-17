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
import { CoreText } from '@singletons/text';
import { CoreWSFile } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { AddonModDataFieldTextHandlerService } from '../../text/services/handler';
import { CoreFileEntry, CoreFileHelper } from '@services/file-helper';
import type { AddonModDataFieldPluginBaseComponent } from '@addons/mod/data/classes/base-field-plugin-component';
import { CoreDom } from '@singletons/dom';

/**
 * Handler for textarea data field plugin.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataFieldTextareaHandlerService extends AddonModDataFieldTextHandlerService {

    name = 'AddonModDataFieldTextareaHandler';
    type = 'textarea';

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<AddonModDataFieldPluginBaseComponent>> {
        const { AddonModDataFieldTextareaComponent } = await import('../component/textarea');

        return AddonModDataFieldTextareaComponent;
    }

    /**
     * @inheritdoc
     */
    getFieldEditData(
        field: AddonModDataField,
        inputData: CoreFormFields<string>,
        originalFieldData: AddonModDataEntryField,
    ): AddonModDataSubfieldData[] {
        const fieldName = 'f_' + field.id;
        const files = this.getFieldEditFiles(field, inputData, originalFieldData);

        let text = CoreFileHelper.restorePluginfileUrls(inputData[fieldName] || '', <CoreWSFile[]> files);
        // Add some HTML to the text if needed.
        text = CoreText.formatHtmlLines(text);

        // WS does not properly check if HTML content is blank when the field is required.
        if (CoreDom.htmlIsBlank(text)) {
            text = '';
        }

        return [
            {
                fieldid: field.id,
                value: text,
            },
            {
                fieldid: field.id,
                subfield: 'content1',
                value: 1,
            },
            {
                fieldid: field.id,
                subfield: 'itemid',
                files: files,
            },
        ];
    }

    /**
     * @inheritdoc
     */
    getFieldEditFiles(
        field: AddonModDataField,
        inputData: CoreFormFields,
        originalFieldData: AddonModDataEntryField,
    ): CoreFileEntry[] {
        return (originalFieldData && originalFieldData.files) || [];
    }

    /**
     * @inheritdoc
     */
    getFieldsNotifications(field: AddonModDataField, inputData: AddonModDataSubfieldData[]): string | undefined {
        if (!field.required) {
            return;
        }

        if (!inputData || !inputData.length) {
            return Translate.instant('addon.mod_data.errormustsupplyvalue');
        }

        const value = inputData.find((value) => value.subfield == '');

        if (!value || CoreDom.htmlIsBlank(<string>value.value || '')) {
            return Translate.instant('addon.mod_data.errormustsupplyvalue');
        }

    }

    /**
     * @inheritdoc
     */
    overrideData(originalContent: AddonModDataEntryField, offlineContent: CoreFormFields<string>): AddonModDataEntryField {
        originalContent.content = offlineContent[''] || '';
        if (originalContent.content.length > 0 && originalContent.files && originalContent.files.length > 0) {
            // Take the original files since we cannot edit them on the app.
            originalContent.content = CoreFileHelper.replacePluginfileUrls(
                originalContent.content,
                <CoreWSFile[]> originalContent.files,
            );
        }

        return originalContent;
    }

}
export const AddonModDataFieldTextareaHandler = makeSingleton(AddonModDataFieldTextareaHandlerService);
