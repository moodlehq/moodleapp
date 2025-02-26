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

import { Component } from '@angular/core';
import { AddonModDataEntryField } from '@addons/mod/data/services/data';
import { AddonModDataFieldPluginBaseComponent } from '@addons/mod/data/classes/base-field-plugin-component';
import { CoreFileSession } from '@services/file-session';
import { CoreFileEntry } from '@services/file-helper';
import { ADDON_MOD_DATA_COMPONENT_LEGACY } from '@addons/mod/data/constants';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component to render data file field.
 */
@Component({
    selector: 'addon-mod-data-field-file',
    templateUrl: 'addon-mod-data-field-file.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonModDataFieldFileComponent extends AddonModDataFieldPluginBaseComponent {

    files: CoreFileEntry[] = [];
    component?: string;
    componentId?: number;
    maxSizeBytes?: number;

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
        }
    }

    /**
     * @inheritdoc
     */
    protected updateValue(value?: Partial<AddonModDataEntryField>): void {
        this.value = value;
        this.files = this.getFiles(value);
    }

}
