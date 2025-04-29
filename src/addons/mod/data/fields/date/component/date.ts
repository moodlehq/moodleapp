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
import { CoreTime } from '@singletons/time';
import { dayjs, Dayjs } from '@/core/utils/dayjs';
import { AddonModDataFieldPluginBaseComponent } from '../../../classes/base-field-plugin-component';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component to render data date field.
 */
@Component({
    selector: 'addon-mod-data-field-date',
    templateUrl: 'addon-mod-data-field-date.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonModDataFieldDateComponent extends AddonModDataFieldPluginBaseComponent {

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

        let dayJSInstance: Dayjs;

        this.maxDate = CoreTime.getDatetimeDefaultMax();
        this.minDate = CoreTime.getDatetimeDefaultMin();

        if (this.searchMode && this.searchFields) {
            this.addControl(`f_${this.field.id}_z`);

            dayJSInstance = this.searchFields['f_' + this.field.id + '_y']
                ? dayjs(this.searchFields['f_' + this.field.id + '_y'] + '-' +
                    this.searchFields['f_' + this.field.id + '_m'] + '-' + this.searchFields['f_' + this.field.id + '_d'])
                : dayjs();

            this.searchFields[`f_${this.field.id}`] = CoreTime.toDatetimeFormat(dayJSInstance.valueOf());
        } else {
            dayJSInstance = this.value?.content
                ? dayjs(parseInt(this.value.content, 10) * 1000)
                : dayjs();

        }

        this.addControl(`f_${this.field.id}`, CoreTime.toDatetimeFormat(dayJSInstance.valueOf()));

        if (!this.searchMode && !this.value?.content) {
            this.onFieldInit.emit({
                fieldid: this.field.id,
                content: String(dayJSInstance.unix()),
            });
        }
    }

}
