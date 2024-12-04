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

/**
 * Component to render the site logo.
 */
@Component({
    selector: 'core-site-logo',
    templateUrl: 'site-logo.html',
    styleUrl: 'site-logo.scss',
    standalone: true,
    imports: [CoreSharedModule],

})
export class CoreSiteLogoComponent implements OnInit, OnDestroy {

    @Input() hideOnError = false;
    @Input() fallbackLogo = 'assets/img/top_logo.png'; // Should be a local path.
    @Input() siteNameMode: CoreSiteLogoSiteNameMode = CoreSiteLogoSiteNameMode.NOTAG;
    @Input() showLogo = true;
    @Input() site?: CoreSite;

    siteName?: string;
    siteLogo?: string;
    logoLoaded = false;

    protected updateSiteObserver: CoreEventObserver;

    constructor() {
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, async () => {
            await this.loadSiteName();
        }, CoreSites.getCurrentSiteId());
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        await this.loadSiteName();
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
     * Load the site name.
     */
    protected async loadSiteName(): Promise<void> {
        const site = this.site ?? CoreSites.getRequiredCurrentSite();
        this.siteName = await site.getSiteName() || '';

        this.siteLogo = site.getLogoUrl() ?? this.fallbackLogo;
        this.logoLoaded = true;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.updateSiteObserver.off();
    }

}

export const enum CoreSiteLogoSiteNameMode {
    HEADING2 = 'h2',
    PARAGRAPH = 'p',
    NOTAG = '',
}
