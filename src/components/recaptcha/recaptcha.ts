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

import { Component, Input } from '@angular/core';
import { ModalController, ViewController, NavParams } from 'ionic-angular';
import { CoreSitesProvider } from '@providers/sites';
import { CoreLangProvider } from '@providers/lang';
import { CoreTextUtilsProvider } from '@providers/utils/text';

/**
 * Directive to display a reCaptcha.
 *
 * Accepts the following attributes:
 * @param {any} model The model where to store the recaptcha response.
 * @param {string} publicKey The site public key.
 * @param {string} [modelValueName] Name of the model property where to store the response. Defaults to 'recaptcharesponse'.
 * @param {string} [siteUrl] The site URL. If not defined, current site.
 */
@Component({
    selector: 'core-recaptcha',
    templateUrl: 'recaptcha.html'
})
export class CoreRecaptchaComponent {
    expired = false;

    protected lang: string;

    @Input() model: any;
    @Input() publicKey: string;
    @Input() modelValueName = 'recaptcharesponse';
    @Input() siteUrl?: string;

    constructor(private sitesProvider: CoreSitesProvider, langProvider: CoreLangProvider,
            private textUtils: CoreTextUtilsProvider, private modalCtrl: ModalController) {

        // Get the current language of the app.
        langProvider.getCurrentLanguage().then((lang) => {
            this.lang = lang;
        });
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.siteUrl = this.siteUrl || this.sitesProvider.getCurrentSite().getURL();
    }

    /**
     * Open the recaptcha modal.
     */
    answerRecaptcha(): void {
        // Set the iframe src. We use an iframe because reCaptcha V2 doesn't work with file:// protocol.
        const src = this.textUtils.concatenatePaths(this.siteUrl, 'webservice/recaptcha.php?lang=' + this.lang);

        // Modal to answer the recaptcha.
        // This is because the size of the recaptcha is dynamic, so it could cause problems if it was displayed inline.
        const modal = this.modalCtrl.create(CoreRecaptchaModalComponent, { src: src },
            { cssClass: 'core-modal-fullscreen'});
        modal.onDidDismiss((data) => {
            this.expired = data.expired;
            this.model[this.modelValueName] = data.value;
        });
        modal.present();
    }
}

@Component({
    selector: 'core-recaptcha',
    templateUrl: 'recaptchamodal.html'
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
