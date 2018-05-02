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
import { Component, OnInit, ElementRef } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { AddonModDataFieldPluginComponent } from '../../../classes/field-plugin-component';
import { CoreFileSessionProvider } from '@providers/file-session';
import { AddonModDataProvider } from '../../../providers/data';

/**
 * Component to render data picture field.
 */
@Component({
    selector: 'addon-mod-data-field-picture',
    templateUrl: 'picture.html'
})
export class AddonModDataFieldPictureComponent extends AddonModDataFieldPluginComponent implements OnInit {

    control: FormControl;
    files = [];
    component: string;
    componentId: number;
    maxSizeBytes: number;

    image: any;
    entryId: number;
    imageUrl: string;
    title: string;
    alttext: string;
    width: string;
    height: string;

    constructor(protected fb: FormBuilder, protected domUtils: CoreDomUtilsProvider, protected textUtils: CoreTextUtilsProvider,
            element: ElementRef, private fileSessionprovider: CoreFileSessionProvider) {
        super();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.render();
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

    protected render(): void {
        if (this.mode != 'search') {
            this.component = AddonModDataProvider.COMPONENT;
            this.componentId = this.database.coursemodule;

            // Edit mode, the list shouldn't change so there is no need to watch it.
            const files = this.value && this.value.files || [];

            // Get image or thumb.
            if (files.length > 0) {
                const filenameSeek = this.mode == 'list' ? 'thumb_' + this.value.content : this.value.content;
                this.image = this.findFile(files, filenameSeek);

                if (!this.image && this.mode == 'list') {
                    this.image = this.findFile(files, this.value.content);
                }

                this.files = [this.image];
            } else {
                this.image = false;
                this.files = [];
            }

            if (this.mode == 'edit') {
                this.maxSizeBytes = parseInt(this.field.param3, 10);
                this.fileSessionprovider.setFiles(this.component, this.database.id + '_' + this.field.id, this.files);
                this.alttext = (this.value && this.value.content1) || '';
            } else {
                this.entryId = (this.value && this.value.recordid) || null;
                this.title = (this.value && this.value.content1) || '';
                this.imageUrl = null;
                if (this.image) {
                    if (this.image.offline) {
                        this.imageUrl = (this.image && this.image.toURL()) || null;
                    } else {
                        this.imageUrl = (this.image && this.image.fileurl) || null;
                    }
                }
                this.width  = this.field.param1 || '';
                this.height = this.field.param2 || '';
            }
        }
    }
}
