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
import { CoreOpener, CoreInAppBrowserInstance } from '@services/opener';
import { CorePlatform } from '@services/platform';
import { CoreSites } from '@services/sites';
import { makeSingleton, Translate } from '@singletons';
import { AlertButton } from '@ionic/angular';
import { CoreLang } from '@services/lang';
import { CoreUserNullSupportConfig } from '@features/user/classes/support/null-support-config';
import { CoreAlerts } from '@services/overlays/alerts';

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
        const inAppBrowser = await (currentSite ?
            currentSite.openInAppWithAutoLogin(supportPageUrl) :
            CoreOpener.openInAppAsync(supportPageUrl));

        if (supportPageUrl.endsWith('/user/contactsitesupport.php')) {
            this.populateSupportForm(inAppBrowser, options.subject, options.message).then(() => {
                // Listen for the support after the first load.
                this.listenSupportFormSubmission(inAppBrowser, supportConfig.getSupportPageLang());

                return;
            }).catch(() => {
                // Ignore errors.
            });
        }

        await inAppBrowser.waitClosed();
    }

    /**
     * Show a help modal that suggests contacting support if available.
     *
     * @param message Help message.
     * @param supportSubject Support subject.
     * @param supportConfig Support configuration. If not provided, it will be obtained from the current site or null if no site.
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
     * @param inAppBrowser In App browser containing the support form.
     * @param subject Title to fill into the form.
     * @param message Details to fill into the form.
     */
    protected async populateSupportForm(
        inAppBrowser: CoreInAppBrowserInstance,
        subject?: string | null,
        message?: string | null,
    ): Promise<void> {
        if (!CorePlatform.isMobile()) {
            return;
        }

        if (subject) {
            subject = Translate.instant('core.user.supportsubject', { subject });
        }

        await inAppBrowser.executeScriptOnLoad(`
            document.querySelector('#id_subject').value = ${JSON.stringify(subject ?? '')};
            document.querySelector('#id_message').value = ${JSON.stringify(message ?? '')};
        `);
    }

    /**
     * Set up listeners to close the browser when the contact form has been submitted.
     *
     * @param inAppBrowser In App browser.
     * @param lang Language used in the support page.
     */
    protected async listenSupportFormSubmission(inAppBrowser: CoreInAppBrowserInstance, lang: string | null): Promise<void> {
        const appSuccessMessage = Translate.instant('core.user.supportmessagesent');
        const lmsSuccessMessage = lang && await CoreLang.getMessage('core.user.supportmessagesent', lang);

        // Execute this script on every load.
        inAppBrowser.onLoaded(() => {
            inAppBrowser.executeScript(`
                const supportFormSubmitted = [...document.querySelectorAll('.alert-success')].some(
                    div =>
                        div.textContent?.includes(${JSON.stringify(lmsSuccessMessage)}) ||
                        div.textContent?.includes(${JSON.stringify(appSuccessMessage)})
                );

                if (supportFormSubmitted) {
                   window.mobileApp.postMessage(JSON.stringify({detail: { supportFormSubmitted: true } }));
                   window.mobileApp.close();
                }
            `);
        });

        inAppBrowser.onMessage((event) => {
            if (event.data?.supportFormSubmitted) {
                inAppBrowser.close();
                CoreAlerts.show({ message: appSuccessMessage });
            }
        });
    }

}

export const CoreUserSupport = makeSingleton(CoreUserSupportService);

/**
 * Options to configure interaction with support.
 */
export type CoreUserSupportContactOptions = {
    supportConfig?: CoreUserSupportConfig | null;
    subject?: string | null;
    message?: string | null;
};
