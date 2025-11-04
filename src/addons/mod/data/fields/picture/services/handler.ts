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
import { CoreFormFields } from '@singletons/form';
import { makeSingleton, Translate } from '@singletons';
import { CoreFileEntry } from '@services/file-helper';
import type { AddonModDataFieldPluginBaseComponent } from '@addons/mod/data/classes/base-field-plugin-component';
import { ADDON_MOD_DATA_COMPONENT_LEGACY } from '@addons/mod/data/constants';

/**
 * Handler for picture data field plugin.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataFieldPictureHandlerService implements AddonModDataFieldHandler {

    name = 'AddonModDataFieldPictureHandler';
    type = 'picture';

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<AddonModDataFieldPluginBaseComponent>> {
        const { AddonModDataFieldPictureComponent } = await import('../component/picture');

        return AddonModDataFieldPictureComponent;
    }

    /**
     * @inheritdoc
     */
    getFieldSearchData(
        field: AddonModDataField,
        inputData: CoreFormFields<string>,
    ): AddonModDataSearchEntriesAdvancedFieldFormatted[] {
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
    getFieldEditData(field: AddonModDataField, inputData: CoreFormFields<string>): AddonModDataSubfieldData[] {
        const files = this.getFieldEditFiles(field);
        const fieldName = `f_${field.id}_alttext`;

        return [
            {
                fieldid: field.id,
                subfield: 'file',
                files: files,
            },
            {
                fieldid: field.id,
                subfield: 'alttext',
                value: inputData[fieldName],
            },
        ];
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
    hasFieldDataChanged(
        field: AddonModDataField,
        inputData: CoreFormFields<string>,
        originalFieldData: AddonModDataEntryField,
    ): boolean {
        const fieldName = `f_${field.id}_alttext`;
        const altText = inputData[fieldName] || '';
        const originalAltText = originalFieldData?.content1 || '';
        if (altText != originalAltText) {
            return true;
        }

        const files = this.getFieldEditFiles(field) || [];
        let originalFiles = originalFieldData?.files || [];

        // Get image.
        if (originalFiles.length > 0) {
            const filenameSeek = originalFieldData?.content || '';
            const file = originalFiles.find((file) => ('name' in file ? file.name : file.filename) == filenameSeek);
            if (file) {
                originalFiles = [file];
            }
        }

        return CoreFileUploader.areFileListDifferent(files, originalFiles);
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

        const found = inputData.some((input) => {
            if (input.subfield !== undefined && input.subfield == 'file') {
                return !!input.value;
            }

            return false;
        });

        if (!found) {
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

        originalContent.content1 = <string> offlineContent.alttext || '';

        return originalContent;
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

}
export const AddonModDataFieldPictureHandler = makeSingleton(AddonModDataFieldPictureHandlerService);
