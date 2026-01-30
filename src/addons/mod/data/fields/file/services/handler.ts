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
import { CoreFileUploader, CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { FileEntry } from '@awesome-cordova-plugins/file/ngx';
import { CoreFileSession } from '@services/file-session';
import { CoreFormFields } from '@static/form';
import { makeSingleton, Translate } from '@singletons';
import { CoreFileEntry } from '@services/file-helper';
import type { AddonModDataFieldPluginBaseComponent } from '@addons/mod/data/classes/base-field-plugin-component';
import { ADDON_MOD_DATA_COMPONENT_LEGACY } from '@addons/mod/data/constants';

/**
 * Handler for file data field plugin.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataFieldFileHandlerService implements AddonModDataFieldHandler {

    name = 'AddonModDataFieldFileHandler';
    type = 'file';

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<AddonModDataFieldPluginBaseComponent>> {
        const { AddonModDataFieldFileComponent } = await import('../component/file');

        return AddonModDataFieldFileComponent;
    }

    /**
     * @inheritdoc
     */
    getFieldSearchData(field: AddonModDataField, inputData: CoreFormFields): AddonModDataSearchEntriesAdvancedFieldFormatted[] {
        const fieldName = `f_${field.id}`;

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
    getFieldEditData(field: AddonModDataField): AddonModDataSubfieldData[] {
        const files = this.getFieldEditFiles(field);

        return [{
            fieldid: field.id,
            subfield: 'file',
            files: files,
        }];
    }

    /**
     * @inheritdoc
     */
    getFieldEditFiles(field: AddonModDataField): CoreFileEntry[] {
        return CoreFileSession.getFiles(ADDON_MOD_DATA_COMPONENT_LEGACY, `${field.dataid}_${field.id}`);
    }

    /**
     * @inheritdoc
     */
    hasFieldDataChanged(field: AddonModDataField, inputData: CoreFormFields, originalFieldData: AddonModDataEntryField): boolean {
        const files = CoreFileSession.getFiles(ADDON_MOD_DATA_COMPONENT_LEGACY, `${field.dataid}_${field.id}`) || [];
        let originalFiles = (originalFieldData && originalFieldData.files) || [];

        if (originalFiles.length) {
            originalFiles = [originalFiles[0]];
        }

        return CoreFileUploader.areFileListDifferent(files, originalFiles);
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
    overrideData(
        originalContent: AddonModDataEntryField,
        offlineContent: CoreFormFields,
        offlineFiles?: FileEntry[],
    ): AddonModDataEntryField {
        const uploadedFilesResult: CoreFileUploaderStoreFilesResult | undefined =
            <CoreFileUploaderStoreFilesResult | undefined> offlineContent?.file;

        if (uploadedFilesResult && uploadedFilesResult.offline > 0 && offlineFiles && offlineFiles?.length > 0) {
            originalContent.content = offlineFiles[0].name;
            originalContent.files = [offlineFiles[0]];
        } else if (uploadedFilesResult && uploadedFilesResult.online && uploadedFilesResult.online.length > 0) {
            originalContent.content = uploadedFilesResult.online[0].filename || '';
            originalContent.files = [uploadedFilesResult.online[0]];
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
export const AddonModDataFieldFileHandler = makeSingleton(AddonModDataFieldFileHandlerService);
