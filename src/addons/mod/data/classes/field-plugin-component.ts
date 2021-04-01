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

import { Input, Output, OnInit, OnChanges, SimpleChange, EventEmitter, Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CoreFormFields } from '@singletons/form';
import { AddonModDataData, AddonModDataEntryField, AddonModDataField, AddonModDataTemplateMode } from '../services/data';

/**
 * Base class for component to render a field.
 */
@Component({
    template: '',
})
export abstract class AddonModDataFieldPluginComponent implements OnInit, OnChanges {

    @Input() mode!: AddonModDataTemplateMode; // The render mode.
    @Input() field!: AddonModDataField; // The field to render.
    @Input() value?: Partial<AddonModDataEntryField>; // The value of the field.
    @Input() database?: AddonModDataData; // Database object.
    @Input() error?: string; // Error when editing.
    @Input() form?: FormGroup; // Form where to add the form control. Just required for edit and search modes.
    @Input() searchFields?: CoreFormFields; // The search value of all fields.
    @Output() gotoEntry: EventEmitter<number>; // Action to perform.

    constructor(protected fb: FormBuilder) {
        this.gotoEntry = new EventEmitter();
    }

    /**
     * Add the form control for the search mode.
     *
     * @param fieldName Control field name.
     * @param value Initial set value.
     */
    protected addControl(fieldName: string, value?: unknown): void {
        if (!this.form) {
            return;
        }

        if (this.searchMode) {
            this.form.addControl(fieldName, this.fb.control(this.searchFields?.[fieldName] || undefined));
        }

        if (this.editMode) {
            this.form.addControl(fieldName, this.fb.control(value, this.field.required ? Validators.required : null));
        }
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.init();
    }

    /**
     * Initialize field.
     */
    protected init(): void {
        return;
    }

    /**
     * Component being changed.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if ((this.showMode || this.listMode) && changes.value) {
            this.updateValue(changes.value.currentValue);
        }
    }

    /**
     * Update value being shown.
     */
    protected updateValue(value?: Partial<AddonModDataEntryField>): void {
        this.value = value;
    }

    /** Magic mode getters */
    get listMode(): boolean {
        return this.mode == AddonModDataTemplateMode.LIST;
    }

    get showMode(): boolean {
        return this.mode == AddonModDataTemplateMode.SHOW;
    }

    get displayMode(): boolean {
        return this.listMode || this.showMode;
    }

    get editMode(): boolean {
        return this.mode == AddonModDataTemplateMode.EDIT;
    }

    get searchMode(): boolean {
        return this.mode == AddonModDataTemplateMode.SEARCH;
    }

    get inputMode(): boolean {
        return this.searchMode || this.editMode;
    }

}
