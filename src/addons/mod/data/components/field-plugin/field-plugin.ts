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

import { Component, OnInit, OnChanges, ViewChild, Input, Output, SimpleChange, Type, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';
import { CoreFormFields } from '@singletons/form';
import { AddonModDataEntryFieldInitialized, AddonModDataFieldPluginBaseComponent } from '../../classes/base-field-plugin-component';
import { AddonModDataData, AddonModDataField } from '../../services/data';
import { AddonModDataFieldsDelegate } from '../../services/data-fields-delegate';
import { AddonModDataTemplateMode } from '../../constants';

/**
 * Component that displays a database field plugin.
 */
@Component({
    selector: 'addon-mod-data-field-plugin',
    templateUrl: 'addon-mod-data-field-plugin.html',
})
export class AddonModDataFieldPluginComponent implements OnInit, OnChanges {

    @ViewChild(CoreDynamicComponent) dynamicComponent?: CoreDynamicComponent<AddonModDataFieldPluginBaseComponent>;

    @Input({ required: true }) mode!: AddonModDataTemplateMode; // The render mode.
    @Input({ required: true }) field!: AddonModDataField; // The field to render.
    @Input() value?: unknown; // The value of the field.
    @Input() database?: AddonModDataData; // Database object.
    @Input() error?: string; // Error when editing.
    @Input() form?: FormGroup; // Form where to add the form control. Just required for edit and search modes.
    @Input() searchFields?: CoreFormFields; // The search value of all fields.
    @Output() gotoEntry = new EventEmitter<number>(); // Action to perform.
    // Output called when the field is initialized with a value and it didn't have one already.
    @Output() onFieldInit = new EventEmitter<AddonModDataEntryFieldInitialized>();

    fieldComponent?: Type<AddonModDataFieldPluginBaseComponent>; // Component to render the plugin.
    pluginData?: AddonDataFieldPluginComponentData; // Data to pass to the component.
    fieldLoaded = false;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (!this.field) {
            this.fieldLoaded = true;

            return;
        }

        try {
            // Check if the plugin has defined its own component to render itself.
            this.fieldComponent = await AddonModDataFieldsDelegate.getComponentForField(this.field);

            if (this.fieldComponent) {
                // Prepare the data to pass to the component.
                this.pluginData = {
                    mode: this.mode,
                    field: this.field,
                    value: this.value,
                    database: this.database,
                    error: this.error,
                    form: this.form,
                    searchFields: this.searchFields,
                    gotoEntry: this.gotoEntry,
                    onFieldInit: this.onFieldInit,
                };
            }
        } finally {
            this.fieldLoaded = true;
        }
    }

    /**
     * Component being changed.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (this.fieldLoaded && this.pluginData) {
            if (this.mode == AddonModDataTemplateMode.EDIT && changes.error) {
                this.pluginData.error = changes.error.currentValue;
            }
            if ((this.mode == AddonModDataTemplateMode.SHOW || this.mode == AddonModDataTemplateMode.LIST) && changes.value) {
                this.pluginData.value = changes.value.currentValue;
            }
        }
    }

}

export type AddonDataFieldPluginComponentData = {
    mode: AddonModDataTemplateMode; // The render mode.
    field: AddonModDataField; // The field to render.
    value?: unknown; // The value of the field.
    database?: AddonModDataData; // Database object.
    error?: string; // Error when editing.
    form?: FormGroup; // Form where to add the form control. Just required for edit and search modes.
    searchFields?: CoreFormFields; // The search value of all fields.
    gotoEntry: EventEmitter<number>;
    onFieldInit: EventEmitter<AddonModDataEntryFieldInitialized>;
};
