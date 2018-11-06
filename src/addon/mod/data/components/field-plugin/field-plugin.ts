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
import { Component, Input, Output, OnInit, Injector, ViewChild, OnChanges, SimpleChange, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { AddonModDataProvider } from '../../providers/data';
import { AddonModDataFieldsDelegate } from '../../providers/fields-delegate';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';

/**
 * Component that displays a database field plugin.
 */
@Component({
    selector: 'addon-mod-data-field-plugin',
    templateUrl: 'addon-mod-data-field-plugin.html',
})
export class AddonModDataFieldPluginComponent implements OnInit, OnChanges {
    @ViewChild(CoreDynamicComponent) dynamicComponent: CoreDynamicComponent;

    @Input() mode: string; // The render mode.
    @Input() field: any; // The field to render.
    @Input() value?: any; // The value of the field.
    @Input() database?: any; // Database object.
    @Input() error?: string; // Error when editing.
    @Output() gotoEntry: EventEmitter<number>; // Action to perform.
    @Input() form?: FormGroup; // Form where to add the form control. Just required for edit and search modes.
    @Input() search?: any; // The search value of all fields.

    fieldComponent: any; // Component to render the plugin.
    data: any; // Data to pass to the component.
    fieldLoaded: boolean;

    constructor(protected injector: Injector, protected dataDelegate: AddonModDataFieldsDelegate,
            protected dataProvider: AddonModDataProvider) {
        this.gotoEntry = new EventEmitter();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (!this.field) {
            this.fieldLoaded = true;

            return;
        }

        // Check if the plugin has defined its own component to render itself.
        this.dataDelegate.getComponentForField(this.injector, this.field).then((component) => {
            this.fieldComponent = component;

            if (component) {
                // Prepare the data to pass to the component.
                this.data = {
                    mode: this.mode,
                    field: this.field,
                    value: this.value,
                    database: this.database,
                    error: this.error,
                    gotoEntry: this.gotoEntry,
                    form: this.form,
                    search: this.search
                };
            }
        }).finally(() => {
            this.fieldLoaded = true;
        });
    }

    /**
     * Component being changed.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (this.fieldLoaded && this.data) {
            if (this.mode == 'edit' && changes.error) {
                this.data.error = changes.error.currentValue;
            }
            if ((this.mode == 'show' || this.mode == 'list') && changes.value) {
                this.data.value = changes.value.currentValue;
            }
        }
    }
}
