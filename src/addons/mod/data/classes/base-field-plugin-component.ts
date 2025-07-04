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

import { Input, Output, OnInit, OnChanges, SimpleChange, EventEmitter, Component, inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CoreFormFields } from '@singletons/form';
import { AddonModDataData, AddonModDataEntryField, AddonModDataField } from '../services/data';
import { AddonModDataTemplateMode } from '../constants';
import { toBoolean } from '@/core/transforms/boolean';

/**
 * Base class for component to render a field.
 */
@Component({
    template: '',
})
export abstract class AddonModDataFieldPluginBaseComponent implements OnInit, OnChanges {

    protected fb = inject(FormBuilder);

    @Input({ required: true }) mode!: AddonModDataTemplateMode; // The render mode.
    @Input({ required: true }) field!: AddonModDataField; // The field to render.
    @Input() value?: Partial<AddonModDataEntryField>; // The value of the field.
    @Input() database?: AddonModDataData; // Database object.
    @Input() error?: string; // Error when editing.
    @Input() form?: FormGroup; // Form where to add the form control. Just required for edit and search modes.
    @Input() searchFields?: CoreFormFields; // The search value of all fields.
    @Input({ transform: toBoolean }) recordHasOffline = false; // Whether the record this field belongs to has offline data.
    @Output() gotoEntry = new EventEmitter<number>(); // Action to perform.
    // Output called when the field is initialized with a value and it didn't have one already.
    @Output() onFieldInit = new EventEmitter<AddonModDataEntryFieldInitialized>();

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
     * @inheritdoc
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
     * @inheritdoc
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

    /* Magic mode getters */
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

/**
 * Data for an initialized field.
 */
export type AddonModDataEntryFieldInitialized = Partial<AddonModDataEntryField> & {
    fieldid: number;
    content: string;
};
