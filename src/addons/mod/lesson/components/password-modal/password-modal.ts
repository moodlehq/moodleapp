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

import { Component, ViewChild, ElementRef } from '@angular/core';
import { IonInput } from '@ionic/angular';

import { CoreSites } from '@services/sites';
import { CoreForms } from '@singletons/form';
import { ModalController } from '@singletons';

/**
 * Modal that asks the password for a lesson.
 */
@Component({
    selector: 'page-addon-mod-lesson-password-modal',
    templateUrl: 'password-modal.html',
})
export class AddonModLessonPasswordModalComponent {

    @ViewChild('passwordForm') formElement?: ElementRef;

    /**
     * Send the password back.
     *
     * @param e Event.
     * @param password The input element.
     */
    submitPassword(e: Event, password: IonInput): void {
        e.preventDefault();
        e.stopPropagation();

        CoreForms.triggerFormSubmittedEvent(this.formElement, false, CoreSites.getCurrentSiteId());

        ModalController.dismiss(password.value);
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        CoreForms.triggerFormCancelledEvent(this.formElement, CoreSites.getCurrentSiteId());

        ModalController.dismiss();
    }

}
