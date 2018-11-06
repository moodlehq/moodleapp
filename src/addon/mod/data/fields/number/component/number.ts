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
 * Component to render data number field.
 */
@Component({
    selector: 'addon-mod-data-field-number',
    templateUrl: 'addon-mod-data-field-number.html'
})
export class AddonModDataFieldNumberComponent extends AddonModDataFieldPluginComponent{

    constructor(protected fb: FormBuilder) {
        super(fb);
    }

    /**
     * Initialize field.
     */
    protected init(): void {
        if (this.isShowOrListMode()) {
            return;
        }

        let value;
        if (this.mode == 'edit' && this.value) {
            const v = parseFloat(this.value.content);
            value = isNaN(v) ? '' : v;
        }

        this.addControl('f_' + this.field.id, value);
    }
}
