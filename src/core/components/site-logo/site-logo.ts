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

import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreSites } from '@services/sites';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSite } from '@classes/sites/site';
import { toBoolean } from '@/core/transforms/boolean';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreUnauthenticatedSite } from '@classes/sites/unauthenticated-site';

/**
 * Component to render the current site logo.
 */
@Component({
    selector: 'core-site-logo',
    templateUrl: 'site-logo.html',
    styleUrl: 'site-logo.scss',
    standalone: true,
    imports: [CoreSharedModule],

})
export class CoreSiteLogoComponent implements OnInit, OnDestroy {

    @Input({ transform: toBoolean }) hideOnError = false;
    @Input() siteNameMode: CoreSiteLogoSiteNameMode = CoreSiteLogoSiteNameMode.NOTAG;
    @Input({ transform: toBoolean }) showLogo = true;
    @Input() site?: CoreSite | CoreUnauthenticatedSite;
    @Input() logoType: 'top' | 'login' = 'login';

    siteName?: string;
    siteId?: string;
    siteLogo?: string;
    logoLoaded = false;
    fallbackLogo = '';
    showSiteName = true;

    protected updateSiteObserver?: CoreEventObserver;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.loadSite();

        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, async () => {
            await this.loadInfo();
        }, this.siteId);

        this.fallbackLogo = this.logoType === 'top' ? 'assets/img/top_logo.png' : 'assets/img/login_logo.png';
        this.showSiteName = this.logoType !== 'top';

        await this.loadInfo();
    }

    /**
     * Function to handle the image error.
     */
    imageError(): void {
        if (this.hideOnError) {
            this.showLogo = false;
        }
        this.siteLogo = undefined;
    }

    /**
     * Load the site and siteId.
     *
     * @returns Site.
     */
    protected loadSite(): CoreSite | CoreUnauthenticatedSite {
        this.site = this.site ?? CoreSites.getRequiredCurrentSite();

        // During login, the siteId could be not defined yet.
        if (!this.siteId && this.site instanceof CoreSite) {
            this.siteId = this.site.getId();
        }

        return this.site;
   }

    /**
     * Load the site name and logo.
     */
    protected async loadInfo(): Promise<void> {
        const site = this.loadSite();

        this.siteName = await site.getSiteName() || '';

        this.showSiteName = this.logoType !== 'top' || site.getShowTopLogo() === 'hidden';

        if (this.logoType === 'top' && site.getShowTopLogo() === 'hidden') {
            this.showLogo = false;
        } else {
            // Get the public config to avoid race conditions when retrieving the logo.
            const siteConfig = await CorePromiseUtils.ignoreErrors(site.getPublicConfig());

            this.siteLogo = this.logoType === 'top'
                ? site.getTopLogoUrl(siteConfig)
                : site.getLogoUrl(siteConfig);
        }

        this.logoLoaded = true;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.updateSiteObserver?.off();
    }

}

export const enum CoreSiteLogoSiteNameMode {
    HEADING2 = 'h2',
    PARAGRAPH = 'p',
    NOTAG = '',
}
