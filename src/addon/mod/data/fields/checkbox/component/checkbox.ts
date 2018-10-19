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

/**
 * Component to render data checkbox field.
 */
@Component({
    selector: 'addon-mod-data-field-checkbox',
    templateUrl: 'addon-mod-data-field-checkbox.html'
})
export class AddonModDataFieldCheckboxComponent extends AddonModDataFieldPluginComponent {

    options = [];

    constructor(protected fb: FormBuilder) {
        super(fb);
    }

    /**
     * Initialize field.
     */
    protected init(): void {
        if (this.isShowOrListMode()) {
            this.updateValue(this.value);

            return;
        }

        this.options = this.field.param1.split(/\r?\n/).map((option) => {
            return { key: option, value: option };
        });

        const values = [];
        if (this.mode == 'edit' && this.value && this.value.content) {
            this.value.content.split('##').forEach((value) => {
                const x = this.options.findIndex((option) => value == option.key);
                if (x >= 0) {
                    values.push(value);
                }
            });
        }

        if (this.mode == 'search') {
            this.addControl('f_' + this.field.id + '_allreq');
        }

        this.addControl('f_' + this.field.id, values);
    }

    /**
     * Update value being shown.
     *
     * @param {any} value New value to be set.
     */
    protected updateValue(value: any): void {
        this.value = value || {};
        this.value.content = value && value.content && value.content.split('##').join('<br>');
    }
}
