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
import { IonicPage, ViewController, NavParams, AlertButton } from 'ionic-angular';

/**
 * Page to render a textarea prompt.
 */
@IonicPage({ segment: 'core-viewer-textarea' })
@Component({
    selector: 'page-core-viewer-textarea',
    templateUrl: 'textarea.html',
})
export class CoreViewerTextAreaPage {
    title: string;
    message: string;
    placeholder: string;
    buttons: AlertButton[];
    text = '';

    constructor(
            protected viewCtrl: ViewController,
            params: NavParams,
            ) {
        this.title = params.get('title');
        this.message = params.get('message');
        this.placeholder = params.get('placeholder') || '';

        const buttons = params.get('buttons');

        this.buttons = buttons.map((button) => {
            if (typeof button === 'string') {
                return { text: button };
            }

            return button;
        });
    }

    /**
     * Button clicked.
     *
     * @param button: Clicked button.
     */
    buttonClicked(button: AlertButton): void {
        let shouldDismiss = true;
        if (button.handler) {
            // A handler has been provided, execute it pass the handler the values from the inputs
            if (button.handler(this.text) === false) {
                // If the return value of the handler is false then do not dismiss
                shouldDismiss = false;
            }
        }

        if (shouldDismiss) {
            this.viewCtrl.dismiss(button.role);
        }
    }
}
