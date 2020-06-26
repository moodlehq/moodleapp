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

import { Component, OnDestroy } from '@angular/core';
import { ViewController, NavParams } from 'ionic-angular';

/**
 * Component to display a the recaptcha in a modal.
 */
@Component({
    selector: 'core-recaptcha-modal',
    templateUrl: 'core-recaptchamodal.html'
})
export class CoreRecaptchaModalComponent implements OnDestroy {
    expired = false;
    value = '';
    src: string;

    protected messageListenerFunction: (event: MessageEvent) => Promise<void>;

    constructor(protected viewCtrl: ViewController, params: NavParams) {
        this.src = params.get('src');

        // Listen for messages from the iframe.
        this.messageListenerFunction = this.onIframeMessage.bind(this);
        window.addEventListener('message', this.messageListenerFunction);
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
     * @param iframe Iframe element.
     */
    loaded(iframe: HTMLIFrameElement): void {
        // Search the iframe content.
        const contentWindow = iframe && iframe.contentWindow;

        if (contentWindow) {
            try {
                // Set the callbacks we're interested in.
                contentWindow['recaptchacallback'] = this.onRecaptchaCallback.bind(this);
                contentWindow['recaptchaexpiredcallback'] = this.onRecaptchaExpiredCallback.bind(this);
            } catch (error) {
                // Cannot access the window.
            }
        }
    }

    /**
     * Treat an iframe message event.
     *
     * @param event Event.
     * @return Promise resolved when done.
     */
    protected async onIframeMessage(event: MessageEvent): Promise<void> {
        if (!event.data || event.data.environment != 'moodleapp' || event.data.context != 'recaptcha') {
            return;
        }

        switch (event.data.action) {
            case 'callback':
                this.onRecaptchaCallback(event.data.value);
                break;
            case 'expired':
                this.onRecaptchaExpiredCallback();
                break;

            default:
                break;
        }
    }

    /**
     * Recapcha callback called.
     *
     * @param value Value received.
     */
    protected onRecaptchaCallback(value: any): void {
        this.expired = false;
        this.value = value;
        this.closeModal();
    }

    /**
     * Recapcha expired callback called.
     */
    protected onRecaptchaExpiredCallback(): void {
        this.expired = true;
        this.value = '';
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        window.removeEventListener('message', this.messageListenerFunction);
    }
}
