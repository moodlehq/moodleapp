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
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component to render data multimenu field.
 */
@Component({
    selector: 'addon-mod-data-field-multimenu',
    templateUrl: 'addon-mod-data-field-multimenu.html',
    imports: [
        CoreSharedModule,
    ],
})
export class AddonModDataFieldMultimenuComponent extends AddonModDataFieldPluginBaseComponent {

    content?: string;
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

        if (this.searchMode) {
            this.addControl(`f_${this.field.id}_allreq`);
        }

        this.addControl(`f_${this.field.id}`, this.getValidValues(this.value));
    }

    /**
     * @inheritdoc
     */
    protected updateValue(value?: Partial<AddonModDataEntryField>): void {
        super.updateValue(value);

        this.content = this.getValidValues(value).join('<br>');
    }

    /**
     * Get the list of valid values from current field value.
     *
     * @param value Field value.
     * @returns List of valid values.
     */
    protected getValidValues(value?: Partial<AddonModDataEntryField>): string[] {
        this.options = this.field.param1.split(/\r?\n/).map((option) => ({ key: option, value: option }));

        return value?.content?.split('##').filter((value) => this.options.some(option => value === option.key)) ?? [];
    }

}
