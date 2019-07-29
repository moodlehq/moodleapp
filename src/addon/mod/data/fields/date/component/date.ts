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
import { TranslateService } from '@ngx-translate/core';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { AddonModDataFieldPluginComponent } from '../../../classes/field-plugin-component';

/**
 * Component to render data date field.
 */
@Component({
    selector: 'addon-mod-data-field-date',
    templateUrl: 'addon-mod-data-field-date.html'
})
export class AddonModDataFieldDateComponent extends AddonModDataFieldPluginComponent {

    format: string;

    constructor(protected fb: FormBuilder, protected timeUtils: CoreTimeUtilsProvider, protected translate: TranslateService) {
        super(fb);
    }

    /**
     * Initialize field.
     */
    protected init(): void {
        if (this.isShowOrListMode()) {
            return;
        }

        let val;

        // Calculate format to use.
        this.format = this.timeUtils.fixFormatForDatetime(this.timeUtils.convertPHPToMoment(
                this.translate.instant('core.strftimedate')));

        if (this.mode == 'search') {
            this.addControl('f_' + this.field.id + '_z');
            val = this.search['f_' + this.field.id + '_y'] ? new Date(this.search['f_' + this.field.id + '_y'] + '-' +
                this.search['f_' + this.field.id + '_m'] + '-' + this.search['f_' + this.field.id + '_d']) : new Date();

            this.search['f_' + this.field.id] = this.timeUtils.toDatetimeFormat(val.getTime());
        } else {
            val = this.value && this.value.content ? new Date(parseInt(this.value.content, 10) * 1000) : new Date();
            val = this.timeUtils.toDatetimeFormat(val.getTime());
        }

        this.addControl('f_' + this.field.id, val);
    }
}
