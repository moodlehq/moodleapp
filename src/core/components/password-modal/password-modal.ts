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

import { Component, ElementRef, viewChild, input, signal } from '@angular/core';

import { CoreSites } from '@services/sites';
import { CoreForms } from '@singletons/form';
import { ModalController } from '@singletons';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreBaseModule } from '@/core/base.module';
import { CoreAutoFocusDirective } from '@directives/auto-focus';
import { CoreContentDirective } from '@directives/content';
import { CoreFaIconDirective } from '@directives/fa-icon';
import { CoreFormatTextDirective } from '@directives/format-text';
import { CoreUpdateNonReactiveAttributesDirective } from '@directives/update-non-reactive-attributes';

/**
 * Modal that asks the password.
 *
 * WARNING: This component is not loaded with components.module.ts.
 */
@Component({
    selector: 'core-password-modal',
    templateUrl: 'password-modal.html',
    imports: [
        CoreBaseModule,
        CoreUpdateNonReactiveAttributesDirective,
        CoreFaIconDirective,
        CoreContentDirective,
        CoreAutoFocusDirective,
        CoreFormatTextDirective,
    ],
})
export class CorePasswordModalComponent {

    formElement = viewChild<ElementRef>('passwordForm');

    title = input<CorePasswordModalInputs['title']>('core.login.password'); // Translatable string shown on modal title.
    placeholder = input<CorePasswordModalInputs['placeholder']>('core.login.password'); // Translatable string shown as placeholder.
    submit = input<CorePasswordModalInputs['submit']>('core.submit'); // Translatable string shown on submit button.
    validator = input<CorePasswordModalInputs['validator']>(); // Function to validate the password.

    password = signal(''); // Previous entered password.
    error = signal<string>(''); // Error message to be shown.

    /**
     * Send the password back.
     *
     * @param e Event.
     */
    async submitPassword(e: Event): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        CoreForms.triggerFormSubmittedEvent(this.formElement(), false, CoreSites.getCurrentSiteId());

        const response = await this.validatePassword(this.password());

        if (response.validated === undefined) {
            ModalController.dismiss(response);
        }

        if (response.validated) {
            ModalController.dismiss(response);
        }

        if (typeof response.error === 'string') {
            this.error.set(response.error);
        } else if (response.error) {
            ModalController.dismiss(response.error);
        }

    }

    /**
     * Validates the entered password if validator is available.
     *
     * @param password Entered password.
     * @returns Response of the modal.
     */
    protected async validatePassword(password: string): Promise<CorePasswordModalResponse> {
        const response: CorePasswordModalResponse = { password };

        const validator = this.validator();
        if (!validator) {
            return response;
        }

        const modal = await CoreLoadings.show('core.loading', true);
        try {
            return await validator(password);
        } catch (error) {
            response.validated = false;
            response.error = error;
        } finally {
            modal.dismiss();
        }

        return response;

    }

    /**
     * Close modal.
     */
    closeModal(): void {
        CoreForms.triggerFormCancelledEvent(this.formElement(), CoreSites.getCurrentSiteId());

        ModalController.dismiss();
    }

}
type CorePasswordModalInputs = {
    title: string;
    placeholder: string;
    submit: string;
    validator: (password?: string) => Promise<CorePasswordModalResponse>;
};

export type CorePasswordModalParams = Partial<CorePasswordModalInputs>;

export type CorePasswordModalResponse = {
    password: string;
    validated?: boolean;
    error?: string;
};
