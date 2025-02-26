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

import { AddonModDataEntryField } from '@addons/mod/data/services/data';
import { Component } from '@angular/core';
import { CoreFileEntry, CoreFileHelper } from '@services/file-helper';
import { CoreFileSession } from '@services/file-session';
import { CoreDom } from '@singletons/dom';
import { AddonModDataFieldPluginBaseComponent } from '../../../classes/base-field-plugin-component';
import { CoreFile } from '@services/file';
import { ADDON_MOD_DATA_COMPONENT_LEGACY } from '@addons/mod/data/constants';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component to render data picture field.
 */
@Component({
    selector: 'addon-mod-data-field-picture',
    templateUrl: 'addon-mod-data-field-picture.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonModDataFieldPictureComponent extends AddonModDataFieldPluginBaseComponent {

    files: CoreFileEntry[] = [];
    component?: string;
    componentId?: number;
    maxSizeBytes?: number;

    image?: CoreFileEntry;
    entryId?: number;
    imageUrl?: string;
    title?: string;
    width?: string;
    height?: string;

    /**
     * Get the files from the input value.
     *
     * @param value Input value.
     * @returns List of files.
     */
    protected getFiles(value?: Partial<AddonModDataEntryField>): CoreFileEntry[] {
        let files = value?.files || [];

        // Reduce to first element.
        if (files.length > 0) {
            files = [files[0]];
        }

        return files;
    }

    /**
     * Find file in a list.
     *
     * @param files File list where to search.
     * @param filenameSeek Filename to search.
     * @returns File found or false.
     */
    protected findFile(
        files: CoreFileEntry[],
        filenameSeek: string,
    ): CoreFileEntry | undefined {
        return files.find((file) => ('name' in file ? file.name : file.filename) == filenameSeek) || undefined;
    }

    /**
     * @inheritdoc
     */
    protected init(): void {
        if (this.searchMode) {
            this.addControl('f_' + this.field.id);

            return;
        }

        this.component = ADDON_MOD_DATA_COMPONENT_LEGACY;
        this.componentId = this.database!.coursemodule;

        this.updateValue(this.value);

        if (this.editMode) {
            this.maxSizeBytes = parseInt(this.field.param3, 10);
            CoreFileSession.setFiles(this.component, this.database!.id + '_' + this.field.id, this.files);

            const alttext = (this.value && this.value.content1) || '';
            this.addControl('f_' + this.field.id + '_alttext', alttext);
        }
    }

    /**
     * @inheritdoc
     */
    protected updateValue(value?: Partial<AddonModDataEntryField>): void {

        // Edit mode, the list shouldn't change so there is no need to watch it.
        const files = value?.files || [];

        // Get image or thumb.
        if (files.length > 0) {
            const filenameSeek = this.listMode
                ? 'thumb_' + value?.content
                : value?.content;
            this.image = this.findFile(files, filenameSeek || '');

            if (!this.image && this.listMode) {
                this.image = this.findFile(files, value?.content || '');
            }

            if (this.image) {
                this.files = [this.image];
            }
        } else {
            this.image = undefined;
            this.files = [];
        }

        if (!this.editMode) {
            this.entryId = (value && value.recordid) || undefined;
            this.title = (value && value.content1) || '';
            this.imageUrl = undefined;
            setTimeout(() => {
                if (this.image) {
                    this.imageUrl = 'name' in this.image
                        ? CoreFile.convertFileSrc(CoreFile.getFileEntryURL(this.image)) // Is Offline.
                        : CoreFileHelper.getFileUrl(this.image);
                }
            }, 1);

            this.width = CoreDom.formatSizeUnits(this.field.param1);
            this.height = CoreDom.formatSizeUnits(this.field.param2);
        }
    }

    /**
     * Navigate to the entry.
     */
    navigateEntry(): void {
        this.gotoEntry.emit(this.entryId);
    }

}
