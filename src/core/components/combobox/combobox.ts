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

import { Component, input, model, output, signal } from '@angular/core';
import { Translate } from '@singletons';
import { ModalOptions } from '@ionic/core';
import { CoreModals } from '@services/overlays/modals';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CoreBaseModule } from '@/core/base.module';
import { CoreFaIconDirective } from '@directives/fa-icon';
import { CoreFormatTextDirective } from '@directives/format-text';
import { CoreUpdateNonReactiveAttributesDirective } from '@directives/update-non-reactive-attributes';

/**
 * Component that show a combo select button (combobox).
 *
 * @description
 *
 * Example using modal:
 *
 * <core-combobox interface="modal" (selectionChange)="selectedChanged($event)" [modalOptions]="modalOptions"
 *      icon="fas-folder" [label]="'core.course.section' | translate">
 *      <span slot="text">selection</span>
 * </core-combobox>
 *
 * Example using popover:
 *
 * <core-combobox [label]="'core.show' | translate" [selection]="selectedFilter" (selectionChange)="selectedChanged()">
 *      <ion-select-option value="1">1</ion-select-option>
 * </core-combobox>
 */
@Component({
    selector: 'core-combobox',
    templateUrl: 'core-combobox.html',
    styleUrl: 'combobox.scss',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            multi: true,
            useExisting: CoreComboboxComponent,
        },
    ],
    imports: [
        CoreBaseModule,
        CoreFaIconDirective,
        CoreUpdateNonReactiveAttributesDirective,
        CoreFormatTextDirective,
    ],
})
export class CoreComboboxComponent implements ControlValueAccessor {

    interface = input<'popover' | 'modal'>('popover');
    label = input(Translate.instant('core.show')); // Aria label.
    disabled = model(false);
    selection = model('');

    // Additional options when interface modal is selected.
    icon = input<string>(); // Icon for modal interface.
    modalOptions = input<ModalOptions>(); // Will emit an event the value changed.
    listboxId = input<string>('');

    /**
     * @deprecated since 5.1. Use (selectionChange) instead.
     */
    onChange = output<unknown>(); // Will emit an event the value changed.

    expanded = signal(false);

    protected touched = signal(false);
    protected formOnChange?: (value: unknown) => void;
    protected formOnTouched?: () => void;

    /**
     * @inheritdoc
     */
    writeValue(selection: string): void {
        this.selection.set(selection);
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
        this.disabled.set(disabled);
    }

    /**
     * Callback when the selected value changes.
     *
     * @param selection Selected value.
     */
    onValueChanged(selection: unknown): void {
        this.touch();
        this.onChange.emit(selection); // eslint-disable-line deprecation/deprecation
        this.formOnChange?.(selection);
    }

    /**
     * Shows combobox modal.
     *
     * @returns Promise resolved when done.
     */
    async openModal(): Promise<void> {
        this.touch();

        const modalOptions = this.modalOptions();
        if (this.expanded() || !modalOptions) {
            return;
        }

        this.expanded.set(true);

        const data = await CoreModals.openModal({
            ...modalOptions,
            id: this.listboxId() || modalOptions.id,
        });
        this.expanded.set(false);

        if (data) {
            this.onValueChanged(data);
        }
    }

    /**
     * Mark as touched.
     */
    protected touch(): void {
        if (this.touched()) {
            return;
        }

        this.touched.set(true);
        this.formOnTouched?.();
    }

}
