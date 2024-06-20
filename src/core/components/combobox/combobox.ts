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

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Translate } from '@singletons';
import { ModalOptions } from '@ionic/core';
import { CoreModals } from '@services/modals';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { toBoolean } from '@/core/transforms/boolean';

/**
 * Component that show a combo select button (combobox).
 *
 * @description
 *
 * Example using modal:
 *
 * <core-combobox interface="modal" (onChange)="selectedChanged($event)" [modalOptions]="modalOptions"
 *      icon="fas-folder" [label]="'core.course.section' | translate">
 *      <span slot="text">selection</span>
 * </core-combobox>
 *
 * Example using popover:
 *
 * <core-combobox [label]="'core.show' | translate" [selection]="selectedFilter" (onChange)="selectedChanged()">
 *      <ion-select-option value="1">1</ion-select-option>
 * </core-combobox>
 */
@Component({
    selector: 'core-combobox',
    templateUrl: 'core-combobox.html',
    styleUrls: ['combobox.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            multi:true,
            useExisting: CoreComboboxComponent,
        },
    ],
})
export class CoreComboboxComponent implements ControlValueAccessor {

    @Input() interface: 'popover' | 'modal' = 'popover';
    @Input() label = Translate.instant('core.show'); // Aria label.
    @Input({ transform: toBoolean }) disabled = false;
    @Input() selection = '';
    @Output() onChange = new EventEmitter<unknown>(); // Will emit an event the value changed.

    // Additional options when interface modal is selected.
    @Input() icon?: string; // Icon for modal interface.
    @Input() modalOptions?: ModalOptions; // Will emit an event the value changed.
    @Input() listboxId = '';

    expanded = false;

    protected touched = false;
    protected formOnChange?: (value: unknown) => void;
    protected formOnTouched?: () => void;

    /**
     * @inheritdoc
     */
    writeValue(selection: string): void {
        this.selection = selection;
    }

    /**
     * @inheritdoc
     */
    registerOnChange(onChange: (value: unknown) => void): void {
        this.formOnChange = onChange;
    }

    /**
     * @inheritdoc
     */
    registerOnTouched(onTouched: () => void): void {
        this.formOnTouched = onTouched;
    }

    /**
     * @inheritdoc
     */
    setDisabledState(disabled: boolean): void {
        this.disabled = disabled;
    }

    /**
     * Callback when the selected value changes.
     *
     * @param selection Selected value.
     */
    onValueChanged(selection: unknown): void {
        this.touch();
        this.onChange.emit(selection);
        this.formOnChange?.(selection);
    }

    /**
     * Shows combobox modal.
     *
     * @returns Promise resolved when done.
     */
    async openModal(): Promise<void> {
        this.touch();

        if (this.expanded || !this.modalOptions) {
            return;
        }
        this.expanded = true;

        if (this.listboxId) {
            this.modalOptions.id = this.listboxId;
        }

        const data = await CoreModals.openModal(this.modalOptions);
        this.expanded = false;

        if (data) {
            this.onValueChanged(data);
        }
    }

    /**
     * Mark as touched.
     */
    protected touch(): void {
        if (this.touched) {
            return;
        }

        this.touched = true;
        this.formOnTouched?.();
    }

}
