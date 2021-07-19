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
import { CoreTimeUtils } from '@services/utils/time';
import { Translate } from '@singletons';
import { AddonModDataFieldPluginComponent } from '../../../classes/field-plugin-component';

/**
 * Component to render data date field.
 */
@Component({
    selector: 'addon-mod-data-field-date',
    templateUrl: 'addon-mod-data-field-date.html',
})
export class AddonModDataFieldDateComponent extends AddonModDataFieldPluginComponent {

    format!: string;
    displayDate?: number;
    maxDate?: string;
    minDate?: string;

    /**
     * @inheritdoc
     */
    protected init(): void {
        if (this.displayMode) {
            this.displayDate = this.value?.content
                ? parseInt(this.value.content, 10) * 1000
                : undefined;

            return;
        }

        let date: Date;

        // Calculate format to use.
        this.format = CoreTimeUtils.fixFormatForDatetime(CoreTimeUtils.convertPHPToMoment(
            Translate.instant('core.strftimedate'),
        ));
        this.maxDate = CoreTimeUtils.getDatetimeDefaultMax();
        this.minDate = CoreTimeUtils.getDatetimeDefaultMin();

        if (this.searchMode) {
            this.addControl('f_' + this.field.id + '_z');

            date = this.searchFields!['f_' + this.field.id + '_y']
                ? new Date(this.searchFields!['f_' + this.field.id + '_y'] + '-' +
                    this.searchFields!['f_' + this.field.id + '_m'] + '-' + this.searchFields!['f_' + this.field.id + '_d'])
                : new Date();

            this.searchFields!['f_' + this.field.id] = CoreTimeUtils.toDatetimeFormat(date.getTime());
        } else {
            date = this.value?.content
                ? new Date(parseInt(this.value.content, 10) * 1000)
                : new Date();

        }

        this.addControl('f_' + this.field.id, CoreTimeUtils.toDatetimeFormat(date.getTime()));
    }

}
