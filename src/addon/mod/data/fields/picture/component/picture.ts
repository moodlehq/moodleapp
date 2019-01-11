// (C) Copyright 2015 Martin Dougiamas
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
import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { CoreFileSessionProvider } from '@providers/file-session';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { AddonModDataFieldPluginComponent } from '../../../classes/field-plugin-component';
import { AddonModDataProvider } from '../../../providers/data';

/**
 * Component to render data picture field.
 */
@Component({
    selector: 'addon-mod-data-field-picture',
    templateUrl: 'addon-mod-data-field-picture.html'
})
export class AddonModDataFieldPictureComponent extends AddonModDataFieldPluginComponent {

    files = [];
    component: string;
    componentId: number;
    maxSizeBytes: number;

    image: any;
    entryId: number;
    imageUrl: string;
    title: string;
    width: string;
    height: string;

    constructor(protected fb: FormBuilder, private fileSessionprovider: CoreFileSessionProvider,
            private domUtils: CoreDomUtilsProvider) {
        super(fb);
    }

    /**
     * Get the files from the input value.
     *
     * @param  {any} value Input value.
     * @return {any}     List of files.
     */
    protected getFiles(value: any): any {
        let files = (value && value.files) || [];

        // Reduce to first element.
        if (files.length > 0) {
            files = [files[0]];
        }

        return files;
    }

    /**
     * Find file in a list.
     *
     * @param {any[]} files         File list where to search.
     * @param {string} filenameSeek Filename to search.
     * @return {any} File found or false.
     */
    protected findFile(files: any[], filenameSeek: string): any {
        return files.find((file) => file.filename == filenameSeek) || false;
    }

    /**
     * Initialize field.
     */
    protected init(): void {
        if (this.mode != 'search') {
            this.component = AddonModDataProvider.COMPONENT;
            this.componentId = this.database.coursemodule;

            this.updateValue(this.value);

            if (this.mode == 'edit') {
                this.maxSizeBytes = parseInt(this.field.param3, 10);
                this.fileSessionprovider.setFiles(this.component, this.database.id + '_' + this.field.id, this.files);

                const alttext = (this.value && this.value.content1) || '';
                this.addControl('f_' + this.field.id + '_alttext', alttext);
            }
        } else {
            this.addControl('f_' + this.field.id);
        }
    }

    /**
     * Update value being shown.
     *
     * @param {any} value New value to be set.
     */
    protected updateValue(value: any): void {
        this.value = value;

        // Edit mode, the list shouldn't change so there is no need to watch it.
        const files = value && value.files || [];

        // Get image or thumb.
        if (files.length > 0) {
            const filenameSeek = this.mode == 'list' ? 'thumb_' + value.content : value.content;
            this.image = this.findFile(files, filenameSeek);

            if (!this.image && this.mode == 'list') {
                this.image = this.findFile(files, value.content);
            }

            this.files = [this.image];
        } else {
            this.image = false;
            this.files = [];
        }

        if (this.mode != 'edit') {
            this.entryId = (value && value.recordid) || null;
            this.title = (value && value.content1) || '';
            this.imageUrl = null;
            setTimeout(() => {
                if (this.image) {
                    this.imageUrl = this.image.offline ? this.image.toURL() : this.image.fileurl;
                }
            }, 1);

            this.width  = this.domUtils.formatPixelsSize(this.field.param1);
            this.height = this.domUtils.formatPixelsSize(this.field.param2);
        }
    }
}
