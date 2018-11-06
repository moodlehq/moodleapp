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
import { AddonModDataFieldPluginComponent } from '../../../classes/field-plugin-component';
import { CoreFileSessionProvider } from '@providers/file-session';
import { AddonModDataProvider } from '../../../providers/data';

/**
 * Component to render data file field.
 */
@Component({
    selector: 'addon-mod-data-field-file',
    templateUrl: 'addon-mod-data-field-file.html'
})
export class AddonModDataFieldFileComponent extends AddonModDataFieldPluginComponent {

    files = [];
    component: string;
    componentId: number;
    maxSizeBytes: number;

    constructor(protected fb: FormBuilder, private fileSessionprovider: CoreFileSessionProvider) {
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
        this.files = this.getFiles(value);
    }
}
