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
import { AddonModDataFieldPluginComponent } from '../../../classes/field-plugin-component';

/**
 * Component to render data url field.
 */
@Component({
    selector: 'addon-mod-data-field-url',
    templateUrl: 'addon-mod-data-field-url.html',
})
export class AddonModDataFieldUrlComponent extends AddonModDataFieldPluginComponent {

    autoLink = false;
    displayValue = '';

    /**
     * @inheritdoc
     */
    protected init(): void {
        if (this.displayMode) {
            return;
        }

        let value: string | undefined;
        if (this.editMode && this.value) {
            value = this.value.content;
        }

        this.addControl('f_' + this.field.id, value);
    }

    /**
     * Calculate data for show or list mode.
     */
    protected calculateShowListData(): void {
        if (!this.value || !this.value.content) {
            return;
        }

        const url = this.value.content;
        const text = this.field.param2 || this.value.content1; // Param2 forces the text to display.

        this.autoLink = parseInt(this.field.param1, 10) === 1;

        if (this.autoLink) {
            this.displayValue = text || url;
        } else {
            // No auto link, always display the URL.
            this.displayValue = url;
        }
    }

    /**
     * @inheritdoc
     */
    protected updateValue(value?: Partial<AddonModDataEntryField>): void {
        super.updateValue(value);

        if (this.displayMode) {
            this.calculateShowListData();
        }
    }

}
