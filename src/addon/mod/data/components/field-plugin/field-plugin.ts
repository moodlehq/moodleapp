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
import { Component, Input, OnInit, Injector, ViewChild } from '@angular/core';
import { AddonModDataProvider } from '../../providers/data';
import { AddonModDataFieldsDelegate } from '../../providers/fields-delegate';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';

/**
 * Component that displays a database field plugin.
 */
@Component({
    selector: 'addon-mod-data-field-plugin',
    templateUrl: 'field-plugin.html',
})
export class AddonModDataFieldPluginComponent implements OnInit {
    @ViewChild(CoreDynamicComponent) dynamicComponent: CoreDynamicComponent;

    @Input() mode: string; // The render mode.
    @Input() field: any; // The field to render.
    @Input() value?: any; // The value of the field.
    @Input() database?: any; // Database object.
    @Input() error?: string; // Error when editing.
    @Input() viewAction: string; // Action to perform.

    fieldComponent: any; // Component to render the plugin.
    data: any; // Data to pass to the component.
    fieldLoaded: boolean;

    constructor(protected injector: Injector, protected dataDelegate: AddonModDataFieldsDelegate,
            protected dataProvider: AddonModDataProvider) {
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
                    viewAction: this.viewAction
                };

            } else {
                this.fieldLoaded = true;
            }
        });
    }

    /**
     * Invalidate the plugin data.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    invalidate(): Promise<any> {
        return Promise.resolve(this.dynamicComponent && this.dynamicComponent.callComponentFunction('invalidate', []));
    }
}
