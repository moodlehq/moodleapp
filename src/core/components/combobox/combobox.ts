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

import { Component, computed, input, model, output, signal } from '@angular/core';
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
export class CoreComboboxComponent<T = unknown> implements ControlValueAccessor {

    readonly interface = input<'popover' | 'modal'>('popover');
    readonly label = input(Translate.instant('core.show')); // Aria label.
    readonly emptySelectionText = input('');

    // When selection is an object, `textKey` specifies which property to show as the visible text in the combobox.
    readonly textKey = input<string>('text');

    // Additional options when interface modal is selected.
    readonly icon = input<string>(); // Icon for modal interface.
    readonly modalOptions = input<ModalOptions>(); // Will emit an event the value changed.
    readonly listboxId = input<string>('');

    readonly disabled = model(false);
    // Selection can be a string or an object depending on the interface used.
    // E.g. when using `interface="modal"` the modal can return complex objects.
    readonly selection = model<T | undefined | null>(undefined);

    /**
     * @deprecated since 5.1. Use (selectionChange) instead.
     */
    readonly onChange = output<T | undefined | null>(); // Will emit an event the value changed.

    readonly selectionText = computed<string>(() => {
        const selection = this.selection();
        if (selection === undefined || selection === '' || selection === null) {
            return this.emptySelectionText();
        }

        const selectionText = this.textKey() && typeof selection === 'object'
            ? (selection as Record<string, unknown>)[this.textKey()]
            : selection;

        return selectionText === undefined || selectionText === null || selectionText === ''
             ? this.emptySelectionText()
             : String(selectionText);
    });

    readonly expanded = signal(false);

    protected readonly touched = signal(false);
    protected formOnChange?: (value: T | undefined | null) => void;
    protected formOnTouched?: () => void;

    /**
     * @inheritdoc
     */
    writeValue(selection: T | undefined | null): void {
        this.selection.set(selection);
    }

    /**
     * @inheritdoc
     */
    registerOnChange(onChange: (value: T | undefined | null) => void): void {
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
    onValueChanged(selection: T | undefined | null): void {
        this.touch();
        this.onChange.emit(selection); // eslint-disable-line @typescript-eslint/no-deprecated
        this.formOnChange?.(selection);
    }

    /**
     * Shows combobox modal.
     */
    async openModal(): Promise<void> {
        this.touch();

        const modalOptions = this.modalOptions();
        if (this.expanded() || !modalOptions) {
            return;
        }

        this.expanded.set(true);

        const data = await CoreModals.openModal<T>({
            ...modalOptions,
            id: this.listboxId() || modalOptions.id,
        });
        this.expanded.set(false);

        // Undefined is considered as cancelled.
        if (data !== undefined) {
            this.selection.set(data);
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
