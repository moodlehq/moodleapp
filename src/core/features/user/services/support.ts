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

import { Injectable } from '@angular/core';
import { CoreUserSupportConfig } from '@features/user/classes/support/support-config';
import { CoreUserAuthenticatedSupportConfig } from '@features/user/classes/support/authenticated-support-config';
import { InAppBrowserObject } from '@awesome-cordova-plugins/in-app-browser';
import { CorePlatform } from '@services/platform';
import { CoreSites } from '@services/sites';
import { makeSingleton, Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { CoreSubscriptions } from '@singletons/subscriptions';
import { AlertButton } from '@ionic/angular';
import { CoreLang } from '@services/lang';
import { CoreUserNullSupportConfig } from '@features/user/classes/support/null-support-config';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreOpener } from '@singletons/opener';

/**
 * Handle site support.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserSupportService {

    /**
     * Contact site support.
     *
     * @param options Options to configure the interaction with support.
     */
    async contact(options: CoreUserSupportContactOptions = {}): Promise<void> {
        const supportConfig = options.supportConfig ?? CoreUserAuthenticatedSupportConfig.forCurrentSite();
        const supportPageUrl = supportConfig.getSupportPageUrl();
        const currentSite = CoreSites.getCurrentSite();
        const browser = await (currentSite ?
            currentSite.openInAppWithAutoLogin(supportPageUrl) :
            CoreOpener.openInApp(supportPageUrl));

        if (browser && supportPageUrl.endsWith('/user/contactsitesupport.php')) {
            this.populateSupportForm(browser, options.subject, options.message);
            this.listenSupportFormSubmission(browser, supportConfig.getSupportPageLang());
        }

        await CoreEvents.waitUntil(CoreEvents.IAB_EXIT);
    }

    /**
     * Show a help modal that suggests contacting support if available.
     *
     * @param message Help message.
     * @param supportSubject Support subject.
     */
    showHelp(message: string, supportSubject: string, supportConfig?: CoreUserSupportConfig): void {
        const buttons: (AlertButton | string)[] = [];

        if (!supportConfig) {
            const site = CoreSites.getCurrentSite();

            supportConfig = site ? new CoreUserAuthenticatedSupportConfig(site) : new CoreUserNullSupportConfig();
        }

        if (supportConfig.canContactSupport()) {
            buttons.push({
                text: Translate.instant('core.contactsupport'),
                handler: () => CoreUserSupport.contact({
                    supportConfig,
                    subject: supportSubject,
                }),
            });
        }

        buttons.push(Translate.instant('core.close'));

        CoreAlerts.show({
            header: Translate.instant('core.help'),
            message,
            buttons,
        });
    }

    /**
     * Inject error details into contact support form.
     *
     * @param browser In App browser containing the support form.
     * @param subject Title to fill into the form.
     * @param message Details to fill into the form.
     */
    protected populateSupportForm(browser: InAppBrowserObject, subject?: string | null, message?: string | null): void {
        if (!CorePlatform.isMobile()) {
            return;
        }

        if (subject) {
            subject = Translate.instant('core.user.supportsubject', { subject });
        }

        const unsubscribe = CoreSubscriptions.once(browser.on('loadstop'), () => {
            browser.executeScript({
                code: `
                    document.querySelector('#id_subject').value = ${JSON.stringify(subject ?? '')};
                    document.querySelector('#id_message').value = ${JSON.stringify(message ?? '')};
                `,
            });
        });

        CoreEvents.once(CoreEvents.IAB_EXIT, () => unsubscribe());
    }

    /**
     * Set up listeners to close the browser when the contact form has been submitted.
     *
     * @param browser In App browser.
     * @param lang Language used in the support page.
     */
    protected async listenSupportFormSubmission(browser: InAppBrowserObject, lang: string | null): Promise<void> {
        if (!CorePlatform.isMobile()) {
            return;
        }

        const appSuccessMessage = Translate.instant('core.user.supportmessagesent');
        const lmsSuccessMessage = lang && await CoreLang.getMessage('core.user.supportmessagesent', lang);
        const subscription = browser.on('loadstop').subscribe(async () => {
            const result = await browser.executeScript({
                code: `
                    [...document.querySelectorAll('.alert-success')].some(
                        div =>
                            div.textContent?.includes(${JSON.stringify(lmsSuccessMessage)}) ||
                            div.textContent?.includes(${JSON.stringify(appSuccessMessage)})
                    )
                `,
            });

            if (!Array.isArray(result) || result[0] !== true) {
                return;
            }

            browser.close();
            CoreAlerts.show({ message: appSuccessMessage });
        });

        CoreEvents.once(CoreEvents.IAB_EXIT, () => subscription.unsubscribe());
    }

}

export const CoreUserSupport = makeSingleton(CoreUserSupportService);

/**
 * Options to configure interaction with support.
 */
export interface CoreUserSupportContactOptions {
    supportConfig?: CoreUserSupportConfig | null;
    subject?: string | null;
    message?: string | null;
}
