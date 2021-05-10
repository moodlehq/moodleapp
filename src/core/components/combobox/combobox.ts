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

import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { Translate } from '@singletons';
import { ModalOptions } from '@ionic/core';
import { CoreDomUtils } from '@services/utils/dom';

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
    encapsulation: ViewEncapsulation.ShadowDom,
})
export class CoreComboboxComponent {

    @Input() interface: 'popover' | 'modal' = 'popover';
    @Input() label = Translate.instant('core.show'); // Aria label.
    @Input() disabled = false;
    @Input() selection = '';
    @Output() onChange = new EventEmitter<unknown>(); // Will emit an event the value changed.

    // Additional options when interface modal is selected.
    @Input() icon?: string; // Icon for modal interface.
    @Input() protected modalOptions?: ModalOptions; // Will emit an event the value changed.
    @Input() listboxId = '';

    expanded = false;

    async showModal(): Promise<void> {
        if (this.expanded || !this.modalOptions) {
            return;
        }
        this.expanded = true;

        if (this.listboxId) {
            this.modalOptions.id = this.listboxId;
        }

        const data = await CoreDomUtils.openModal(this.modalOptions);
        this.expanded = false;

        if (data) {
            this.onChange.emit(data);
        }
    }

}
