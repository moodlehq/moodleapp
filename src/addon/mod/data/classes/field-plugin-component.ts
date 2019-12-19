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
import { Input, Output, OnInit, OnChanges, SimpleChange, EventEmitter } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

/**
 * Base class for component to render a field.
 */
export class AddonModDataFieldPluginComponent implements OnInit, OnChanges {
    @Input() mode: string; // The render mode.
    @Input() field: any; // The field to render.
    @Input() value?: any; // The value of the field.
    @Input() database?: any; // Database object.
    @Input() error?: string; // Error when editing.
    @Output() gotoEntry?: EventEmitter<number>; // Action to perform.
    @Input() form?: FormGroup; // Form where to add the form control. Just required for edit and search modes.
    @Input() search?: any; // The search value of all fields.

    constructor(protected fb: FormBuilder) {
        this.gotoEntry = new EventEmitter();
    }

    /**
     * Add the form control for the search mode.
     *
     * @param fieldName Control field name.
     * @param value Initial set value.
     */
    protected addControl(fieldName: string, value?: any): void {
        if (!this.form) {
            return;
        }

        if (this.mode == 'search') {
            this.form.addControl(fieldName, this.fb.control(this.search[fieldName] || null));
        }

        if (this.mode == 'edit') {
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
     * Return if is shown or list mode.
     *
     * @return True if mode is show or list.
     */
    isShowOrListMode(): boolean {
        return this.mode == 'list' || this.mode == 'show';
    }

    /**
     * Component being changed.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (this.isShowOrListMode() && changes.value) {
            this.updateValue(changes.value.currentValue);
        }
    }

    /**
     * Update value being shown.
     */
    protected updateValue(value: any): void {
        this.value = value;
    }
}
