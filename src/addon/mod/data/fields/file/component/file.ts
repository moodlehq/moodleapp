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
import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { AddonModDataFieldPluginComponent } from '../../../classes/field-plugin-component';
import { CoreFileSessionProvider } from '@providers/file-session';
import { AddonModDataProvider } from '../../../providers/data';

/**
 * Component to render data file field.
 */
@Component({
    selector: 'addon-mod-data-field-file',
    templateUrl: 'file.html'
})
export class AddonModDataFieldFileComponent extends AddonModDataFieldPluginComponent implements OnInit {

    files = [];
    component: string;
    componentId: number;
    maxSizeBytes: number;

    constructor(protected fb: FormBuilder, private fileSessionprovider: CoreFileSessionProvider) {
        super(fb);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.mode = this.mode == 'list' ? 'show' : this.mode;
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

    protected render(): void {
        if (this.mode == 'show' || this.mode == 'edit') {
            this.component = AddonModDataProvider.COMPONENT;
            this.componentId = this.database.coursemodule;

            this.files = this.getFiles(this.value);

            if (this.mode != 'show') {
                // Edit mode, the list shouldn't change so there is no need to watch it.
                this.maxSizeBytes = parseInt(this.field.param3, 10);
                this.fileSessionprovider.setFiles(this.component, this.database.id + '_' + this.field.id, this.files);
            }
        }

        this.addControl('f_' + this.field.id);
    }
}
