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

import { Component, Input, OnChanges, SimpleChange } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Translate } from '@singletons';

/**
 * Component to show errors if an input isn't valid.
 *
 * @description
 * The purpose of this component is to make easier and consistent the validation of forms.
 *
 * It should be applied next to the input element (ion-input, ion-select, ...). In case of ion-checkbox, it should be in another
 * item, placing it in the same item as the checkbox will cause problems.
 *
 * Please notice that the inputs need to have a FormControl to make it work. That FormControl needs to be passed to this component.
 *
 * Example usage:
 *
 * <ion-item class="ion-text-wrap">
 *     <ion-label stacked core-mark-required="true">{{ 'core.login.username' | translate }}</ion-label>
 *     <ion-input type="text" name="username" formControlName="username"></ion-input>
 *     <core-input-errors [control]="myForm.controls.username" [errorMessages]="usernameErrors"></core-input-errors>
 * </ion-item>
 */
@Component({
    selector: 'core-input-errors',
    templateUrl: 'core-input-errors.html',
    styleUrls: ['input-errors.scss'],
})
export class CoreInputErrorsComponent implements OnChanges {

    @Input() control?: FormControl;
    @Input() errorMessages?: Record<string, string>;
    @Input() errorText?: string; // Set other non automatic errors.
    errorKeys: string[] = [];

    /**
     * Initialize some common errors if they aren't set.
     */
    protected initErrorMessages(): void {
        this.errorMessages = this.errorMessages || {};

        this.errorMessages.required = this.errorMessages.required || Translate.instant('core.required');
        this.errorMessages.email = this.errorMessages.email || Translate.instant('core.login.invalidemail');
        this.errorMessages.date = this.errorMessages.date || Translate.instant('core.login.invaliddate');
        this.errorMessages.datetime = this.errorMessages.datetime || Translate.instant('core.login.invaliddate');
        this.errorMessages.datetimelocal = this.errorMessages.datetimelocal || Translate.instant('core.login.invaliddate');
        this.errorMessages.time = this.errorMessages.time || Translate.instant('core.login.invalidtime');
        this.errorMessages.url = this.errorMessages.url || Translate.instant('core.login.invalidurl');

        // Set empty values by default, the default error messages will be built in the template when needed.
        this.errorMessages.max = this.errorMessages.max || '';
        this.errorMessages.min = this.errorMessages.min || '';
    }

    /**
     * Component being changed.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if ((changes.control || changes.errorMessages) && this.control) {
            this.initErrorMessages();

            this.errorKeys = this.errorMessages ? Object.keys(this.errorMessages) : [];
        }
        if (changes.errorText) {
            this.errorText = changes.errorText.currentValue;
        }
    }

}
