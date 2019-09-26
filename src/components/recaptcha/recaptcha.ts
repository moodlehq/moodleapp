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

import { Component, Input } from '@angular/core';
import { ModalController } from 'ionic-angular';
import { CoreSitesProvider } from '@providers/sites';
import { CoreLangProvider } from '@providers/lang';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreRecaptchaModalComponent } from './recaptchamodal';

/**
 * Component that allows answering a recaptcha.
 */
@Component({
    selector: 'core-recaptcha',
    templateUrl: 'core-recaptcha.html'
})
export class CoreRecaptchaComponent {
    @Input() model: any; // The model where to store the recaptcha response.
    @Input() publicKey: string; // The site public key.
    @Input() modelValueName = 'recaptcharesponse'; // Name of the model property where to store the response.
    @Input() siteUrl?: string; // The site URL. If not defined, current site.

    expired = false;

    protected lang: string;

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
