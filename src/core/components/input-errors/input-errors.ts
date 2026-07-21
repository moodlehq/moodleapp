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

import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChange, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { CoreBaseModule } from '@/core/base.module';

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
 *     <ion-input type="text" name="username" formControlName="username" required="true"></ion-input>
 *     <core-input-errors [control]="myForm.controls.username" [errorMessages]="usernameErrors"></core-input-errors>
 * </ion-item>
 */
@Component({
    selector: 'core-input-errors',
    templateUrl: 'core-input-errors.html',
    styleUrl: 'input-errors.scss',
    imports: [
        CoreBaseModule,
    ],
    host: {
        '[class.has-errors]': 'hasVisibleErrors',
        '[role]': '"alert"',
    },
})
export class CoreInputErrorsComponent implements OnInit, OnChanges {

    @Input() control?: FormControl<unknown>; // Needed to be able to check the validity of the input.
    @Input() errorMessages: CoreInputErrorsMessages = {}; // Error messages to show. Keys must be the name of the error.
    @Input() errorText = ''; // Set other non automatic errors.
    /**
     * When true, skip required/requiredTrue messages (use label asterisk + field highlight instead).
     * Other validation errors (pattern, email mismatch, ...) are still shown.
     */
    @Input() hideRequiredError = false;
    errorKeys: string[] = [];

    protected hostElement: HTMLElement = inject(ElementRef).nativeElement;

    /**
     * Whether there is a visible error message to render.
     */
    get hasVisibleErrors(): boolean {
        if (this.errorText) {
            return true;
        }

        if (!this.control || (!this.control.dirty && !this.control.touched) || this.control.valid) {
            return false;
        }

        const errors = this.control.errors;
        if (!errors) {
            return false;
        }

        return Object.keys(errors).some((error) => this.shouldShowError(error) && this.errorKeys.includes(error));
    }

    /**
     * Initialize some common errors if they aren't set.
     */
    protected initErrorMessages(): void {
        // Set default error messages.
        this.errorMessages = {
            required: 'core.required',
            email: 'core.login.invalidemail',
            date: 'core.login.invaliddate',
            datetime: 'core.login.invaliddate',
            datetimelocal: 'core.login.invaliddate',
            time: 'core.login.invalidtime',
            url: 'core.login.invalidurl',
            // Set empty values by default, the default error messages will be built in the template when needed.
            max: '',
            min: '',
            ...this.errorMessages,
        };

        this.errorMessages.requiredTrue = this.errorMessages.required;

        this.errorKeys = Object.keys(this.errorMessages);
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        const parent = this.hostElement.parentElement;
        let item: HTMLElement | null = null;

        if (parent?.tagName === 'ION-ITEM') {
            item = parent;

            // Get all elements on the parent and wrap them with a div.
            // This is needed because otherwise the error message will be shown on the right of the input. Or overflowing the item.
            const wrapper = document.createElement('div');

            wrapper.classList.add('core-input-errors-wrapper');

            Array.from(parent.children).forEach((child) => {
                if (!child.slot) {
                    wrapper.appendChild(child);
                }
            });

            parent.appendChild(wrapper);
        } else {
            item = this.hostElement.closest('ion-item');
        }

        item?.classList.add('has-core-input-errors');

    }

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if ((changes.control || changes.errorMessages) && this.control) {
            this.initErrorMessages();
        }
    }

    /**
     * Get error message for pattern error.
     *
     * @returns Error message, undefined if not found.
     */
    getPatternErrorMessage(): string | undefined {
        const patternError = this.control?.errors?.pattern;
        if (!this.errorMessages?.pattern || !patternError) {
            return;
        }

        if (typeof this.errorMessages.pattern === 'string') {
            return this.errorMessages.pattern;
        }

        return this.errorMessages.pattern[patternError.requiredPattern];
    }

    /**
     * Whether a given error key should be rendered.
     *
     * @param error Error key.
     * @returns Whether to show it.
     */
    shouldShowError(error: string): boolean {
        if (this.hideRequiredError && (error === 'required' || error === 'requiredTrue')) {
            return false;
        }

        return true;
    }

}

/**
 * Error messages for each type of error.
 * Error messages will be translated in the template, they don't need to be translated already.
 */
export type CoreInputErrorsMessages = {
    required?: string;
    requiredTrue?: string;
    email?: string;
    date?: string;
    datetime?: string;
    datetimelocal?: string;
    time?: string;
    url?: string;
    max?: string;
    min?: string;
    maxlength?: string;
    minlength?: string;
    // For pattern errors you can define an error for all patterns (string), or one error per pattern.
    // In the latter case, the key of the object is the pattern and the value is the error message identifier.
    pattern?: string | Record<string,string>;
};
