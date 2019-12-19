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

import { Component } from '@angular/core';
import { IonicPage, ViewController } from 'ionic-angular';

/**
 * Modal that asks the password for a lesson.
 */
@IonicPage({ segment: 'addon-mod-lesson-password-modal' })
@Component({
    selector: 'page-addon-mod-lesson-password-modal',
    templateUrl: 'password-modal.html',
})
export class AddonModLessonPasswordModalPage {

    constructor(protected viewCtrl: ViewController) { }

    /**
     * Send the password back.
     *
     * @param e Event.
     * @param password The input element.
     */
    submitPassword(e: Event, password: HTMLInputElement): void {
        e.preventDefault();
        e.stopPropagation();

        this.viewCtrl.dismiss(password.value);
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        this.viewCtrl.dismiss();
    }
}
