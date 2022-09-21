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
import { CoreError } from '@classes/errors/error';
import { CoreSiteConfig, CoreSitePublicConfigResponse } from '@classes/site';
import { InAppBrowserObject } from '@ionic-native/in-app-browser';
import { CorePlatform } from '@services/platform';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { CoreSubscriptions } from '@singletons/subscriptions';

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
        const supportPageUrl = options.supportPageUrl ?? CoreSites.getRequiredCurrentSite().getSupportPageUrl();

        if (!supportPageUrl) {
            throw new CoreError('Could not get support url');
        }

        const autoLoginUrl = await CoreSites.getCurrentSite()?.getAutoLoginUrl(supportPageUrl, false);
        const browser = CoreUtils.openInApp(autoLoginUrl ?? supportPageUrl);

        if (supportPageUrl.endsWith('/user/contactsitesupport.php')) {
            this.populateSupportForm(browser, options.subject, options.message);
        }

        await CoreEvents.waitUntil(CoreEvents.IAB_EXIT);
    }

    /**
     * Get support page url from site config.
     *
     * @param config Site config.
     * @returns Support page url.
     */
    getSupportPageUrl(config: CoreSitePublicConfigResponse): string;
    getSupportPageUrl(config: CoreSiteConfig, siteUrl: string): string;
    getSupportPageUrl(config: CoreSiteConfig | CoreSitePublicConfigResponse, siteUrl?: string): string {
        return config.supportpage?.trim()
            || `${config.httpswwwroot ?? config.wwwroot ?? siteUrl}/user/contactsitesupport.php`;
    }

    /**
     * Check whether a site config allows contacting support.
     *
     * @param config Site config.
     * @returns Whether site support can be contacted.
     */
    canContactSupport(config: CoreSiteConfig | CoreSitePublicConfigResponse): boolean {
        return 'supportpage' in config;
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

}

export const CoreUserSupport = makeSingleton(CoreUserSupportService);

/**
 * Options to configure interaction with support.
 */
export interface CoreUserSupportContactOptions {
    supportPageUrl?: string | null;
    subject?: string | null;
    message?: string | null;
}
