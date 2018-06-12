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
import { ViewController, NavParams } from 'ionic-angular';

/**
 * Component to display a the recaptcha in a modal.
 */
@Component({
    selector: 'core-recaptcha-modal',
    templateUrl: 'core-recaptchamodal.html'
})
export class CoreRecaptchaModalComponent {
    expired = false;
    value = '';
    src: string;

    constructor(protected viewCtrl: ViewController, params: NavParams) {
        this.src = params.get('src');
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        this.viewCtrl.dismiss({
            expired: this.expired,
            value: this.value
        });
    }

    /**
     * The iframe with the recaptcha was loaded.
     *
     * @param {HTMLIFrameElement} iframe Iframe element.
     */
    loaded(iframe: HTMLIFrameElement): void {
        // Search the iframe content.
        const contentWindow = iframe && iframe.contentWindow;

        if (contentWindow) {
            // Set the callbacks we're interested in.
            contentWindow['recaptchacallback'] = (value): void => {
                this.expired = false;
                this.value = value;
                this.closeModal();
            };

            contentWindow['recaptchaexpiredcallback'] = (): void => {
                // Verification expired. Check the checkbox again.
                this.expired = true;
                this.value = '';
            };
        }
    }
}
