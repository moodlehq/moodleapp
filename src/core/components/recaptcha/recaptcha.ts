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

import { toBoolean } from '@/core/transforms/boolean';
import { Component, Input, OnInit } from '@angular/core';

import { CoreLang, CoreLangFormat } from '@services/lang';
import { CoreSites } from '@services/sites';
import { CoreOpener } from '@singletons/opener';
import { CorePath } from '@singletons/path';
import { CoreBaseModule } from '@/core/base.module';
import { CoreUpdateNonReactiveAttributesDirective } from '@directives/update-non-reactive-attributes';

/**
 * Component that allows answering a recaptcha.
 */
@Component({
    selector: 'core-recaptcha',
    templateUrl: 'core-recaptcha.html',
    standalone: true,
    imports: [
        CoreBaseModule,
        CoreUpdateNonReactiveAttributesDirective,
    ],
})
export class CoreRecaptchaComponent implements OnInit {

    @Input() model: Record<string, string> = {}; // The model where to store the recaptcha response.
    @Input() publicKey?: string; // The site public key.
    @Input() modelValueName = 'recaptcharesponse'; // Name of the model property where to store the response.
    @Input() siteUrl = ''; // The site URL. If not defined, current site.
    @Input({ transform: toBoolean }) showRequiredError = false; // Whether to display the required error if recaptcha not answered.

    expired = false;

    protected lang?: string;

    constructor() {
        this.initLang();
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.siteUrl = this.siteUrl || CoreSites.getRequiredCurrentSite().getURL();
    }

    /**
     * Initialize the lang property.
     */
    protected async initLang(): Promise<void> {
        this.lang = await CoreLang.getCurrentLanguage(CoreLangFormat.LMS);
    }

    /**
     * Let the user answer the recaptcha.
     */
    async answerRecaptcha(): Promise<void> {
        // Open the recaptcha challenge in an InAppBrowser.
        // The app used to use an iframe for this, but the app can no longer access the iframe to create the required callbacks.
        // The app cannot render the recaptcha directly because it has problems with the local protocols and domains.
        const src = CorePath.concatenatePaths(this.siteUrl, 'webservice/recaptcha.php?lang=' + this.lang);

        const inAppBrowserWindow = CoreOpener.openInApp(src);
        if (!inAppBrowserWindow) {
            return;
        }

        // Set the callbacks once the page is loaded.
        const loadStopSubscription = inAppBrowserWindow.on('loadstop').subscribe(() => {
            inAppBrowserWindow.executeScript({
                code:
                    'window.recaptchacallback = (value) => webkit.messageHandlers.cordova_iab.postMessage(' +
                        'JSON.stringify({ action: "callback", value }));' +
                    'window.recaptchaexpiredcallback = () => webkit.messageHandlers.cordova_iab.postMessage(' +
                        'JSON.stringify({ action: "expired" }));',
            });
        });

        // Listen for events.
        const messageSubscription = inAppBrowserWindow.on('message').subscribe((event) => {
            if (!event.data) {
                return;
            }

            if (event.data.action == 'expired') {
                this.expireRecaptchaAnswer();
            } else if (event.data.action == 'callback') {
                this.expired = false;
                this.model[this.modelValueName] = event.data.value;

                // Close the InAppBrowser now.
                inAppBrowserWindow.close();
                messageSubscription.unsubscribe();
                loadStopSubscription.unsubscribe();
            }
        });
    }

    /**
     * Expire the recaptcha answer.
     */
    expireRecaptchaAnswer(): void {
        this.expired = true;
        this.model[this.modelValueName] = '';
    }

}
