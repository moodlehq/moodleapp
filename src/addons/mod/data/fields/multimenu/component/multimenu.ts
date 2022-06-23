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
import { AddonModDataFieldPluginBaseComponent } from '../../../classes/base-field-plugin-component';

/**
 * Component to render data multimenu field.
 */
@Component({
    selector: 'addon-mod-data-field-multimenu',
    templateUrl: 'addon-mod-data-field-multimenu.html',
})
export class AddonModDataFieldMultimenuComponent extends AddonModDataFieldPluginBaseComponent {

    options: {
        key: string;
        value: string;
    }[] = [];

    /**
     * @inheritdoc
     */
    protected init(): void {
        if (this.displayMode) {
            this.updateValue(this.value);

            return;
        }

        this.options = this.field.param1.split(/\r?\n/).map((option) => ({ key: option, value: option }));

        const values: string[] = [];
        if (this.editMode && this.value?.content) {
            this.value.content.split('##').forEach((value) => {
                const x = this.options.findIndex((option) => value == option.key);
                if (x >= 0) {
                    values.push(value);
                }
            });
        }

        if (this.searchMode) {
            this.addControl('f_' + this.field.id + '_allreq');
        }

        this.addControl('f_' + this.field.id, values);
    }

    /**
     * @inheritdoc
     */
    protected updateValue(value?: Partial<AddonModDataEntryField>): void {
        this.value = value || {};
        this.value.content = value?.content && value.content.split('##').join('<br>');
    }

}
