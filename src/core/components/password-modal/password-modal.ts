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

import { Component, ViewChild, ElementRef, Input } from '@angular/core';

import { CoreSites } from '@services/sites';
import { CoreForms } from '@singletons/form';
import { ModalController } from '@singletons';
import { CoreDomUtils } from '@services/utils/dom';

/**
 * Modal that asks the password.
 *
 * WARNING: This component is not loaded with components.module.ts.
 */
@Component({
    selector: 'core-password-modal',
    templateUrl: 'password-modal.html',
})
export class CorePasswordModalComponent {

    @ViewChild('passwordForm') formElement?: ElementRef;

    @Input() title = 'core.login.password'; // Translatable string to be shown on modal title.
    @Input() placeholder =  'core.login.password'; // Translatable string to be shown on password input as placeholder.
    @Input() submit = 'core.submit'; // Translatable string to be shown on submit button.
    @Input() validator?: (password?: string) => Promise<CorePasswordModalResponse>; // Function to validate the password.

    password = ''; // Previous entered password.
    error?: string; // Error message to be shown.

    /**
     * Send the password back.
     *
     * @param e Event.
     */
    async submitPassword(e: Event): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        CoreForms.triggerFormSubmittedEvent(this.formElement, false, CoreSites.getCurrentSiteId());

        const response = await this.validatePassword(this.password);

        if (response.validated === undefined) {
            ModalController.dismiss(response);
        }

        if (response.validated) {
            ModalController.dismiss(response);
        }

        if (typeof response.error === 'string') {
            this.error = response.error;
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

        if (!this.validator) {
            return response;
        }

        const modal = await CoreDomUtils.showModalLoading('core.loading', true);
        try {
            return await this.validator(password);
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
        CoreForms.triggerFormCancelledEvent(this.formElement, CoreSites.getCurrentSiteId());

        ModalController.dismiss();
    }

}

export type CorePasswordModalParams = Partial<Pick<CorePasswordModalComponent, 'title' | 'placeholder' | 'submit' | 'validator'>>;

export type CorePasswordModalResponse = {
    password: string;
    validated?: boolean;
    error?: string;
};
