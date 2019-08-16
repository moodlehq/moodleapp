// (C) Copyright 2015 Martin Dougiamas
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
 * Page that displays a form to enter a password to self enrol in a course.
 */
@IonicPage({ segment: 'core-courses-self-enrol-password' })
@Component({
    selector: 'page-core-courses-self-enrol-password',
    templateUrl: 'self-enrol-password.html',
})
export class CoreCoursesSelfEnrolPasswordPage {
    constructor(private viewCtrl: ViewController) { }

    /**
     * Close help modal.
     */
    close(): void {
        this.viewCtrl.dismiss();
    }

    /**
     * Submit password.
     *
     * @param {Event} e Event.
     * @param {string} password Password to submit.
     */
    submitPassword(e: Event, password: string): void {
        e.preventDefault();
        e.stopPropagation();

        this.viewCtrl.dismiss(password);
    }
}
