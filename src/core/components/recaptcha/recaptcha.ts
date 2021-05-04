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

import { Component, Input, OnInit } from '@angular/core';

import { CoreLang } from '@services/lang';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { CoreRecaptchaModalComponent, CoreRecaptchaModalReturn } from './recaptcha-modal';

/**
 * Component that allows answering a recaptcha.
 */
@Component({
    selector: 'core-recaptcha',
    templateUrl: 'core-recaptcha.html',
})
export class CoreRecaptchaComponent implements OnInit {

    @Input() model?: Record<string, string>; // The model where to store the recaptcha response.
    @Input() publicKey?: string; // The site public key.
    @Input() modelValueName = 'recaptcharesponse'; // Name of the model property where to store the response.
    @Input() siteUrl?: string; // The site URL. If not defined, current site.

    expired = false;

    protected lang?: string;

    constructor() {
        this.initLang();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.siteUrl = this.siteUrl || CoreSites.getCurrentSite()?.getURL();
    }

    /**
     * Initialize the lang property.
     */
    protected async initLang(): Promise<void> {
        this.lang = await CoreLang.getCurrentLanguage();
    }

    /**
     * Open the recaptcha modal.
     */
    async answerRecaptcha(): Promise<void> {
        // Set the iframe src. We use an iframe because reCaptcha V2 doesn't work with file:// protocol.
        const src = CoreTextUtils.concatenatePaths(this.siteUrl!, 'webservice/recaptcha.php?lang=' + this.lang);

        // Modal to answer the recaptcha.
        // This is because the size of the recaptcha is dynamic, so it could cause problems if it was displayed inline.

        const modalData = await CoreDomUtils.openModal<CoreRecaptchaModalReturn>({
            component: CoreRecaptchaModalComponent,
            cssClass: 'core-modal-fullscreen',
            componentProps: {
                recaptchaUrl: src,
            },
        });

        if (modalData) {
            this.expired = modalData.expired;
            this.model![this.modelValueName] = modalData.value;
        }
    }

}
