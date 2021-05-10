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
import { NavParams } from '@ionic/angular';
import { CoreSites } from '@services/sites';
import { ModalController } from '@singletons';
import { CoreForms } from '@singletons/form';

/**
 * Modal that displays a form to enter a password to self enrol in a course.
 */
@Component({
    selector: 'page-core-courses-self-enrol-password',
    templateUrl: 'self-enrol-password.html',
})
export class CoreCoursesSelfEnrolPasswordComponent {

    @ViewChild('enrolPasswordForm') formElement!: ElementRef;
    password = '';

    constructor(
        navParams: NavParams,
    ) {
        this.password = navParams.get('password') || '';
    }

    /**
     * Close help modal.
     */
    close(): void {
        CoreForms.triggerFormCancelledEvent(this.formElement, CoreSites.getCurrentSiteId());

        ModalController.dismiss();
    }

    /**
     * Submit password.
     *
     * @param e Event.
     * @param password Password to submit.
     */
    submitPassword(e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        CoreForms.triggerFormSubmittedEvent(this.formElement, false, CoreSites.getCurrentSiteId());

        ModalController.dismiss(this.password);
    }

}
