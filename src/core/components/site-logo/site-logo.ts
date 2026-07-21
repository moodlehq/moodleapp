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

import { Component, OnInit, OnDestroy, input, computed, signal, effect, untracked } from '@angular/core';
import { CoreSites } from '@services/sites';
import { CoreEventObserver, CoreEvents } from '@static/events';
import { CoreSite, CoreSiteConfig } from '@classes/sites/site';
import { toBoolean } from '@/core/transforms/boolean';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreUnauthenticatedSite } from '@classes/sites/unauthenticated-site';
import { CoreConstants } from '@/core/constants';
import { CoreBaseModule } from '@/core/base.module';
import { CoreExternalContentDirective } from '@directives/external-content';
import { CoreFormatTextDirective } from '@directives/format-text';

/**
 * Component to render the current site logo.
 */
@Component({
    selector: 'core-site-logo',
    templateUrl: 'site-logo.html',
    styleUrl: 'site-logo.scss',
    imports: [
        CoreBaseModule,
        CoreExternalContentDirective,
        CoreFormatTextDirective,
    ],
})
export class CoreSiteLogoComponent implements OnInit, OnDestroy {

    readonly hideOnError = input(false, { transform: toBoolean });
    readonly siteNameMode = input<CoreSiteLogoSiteNameMode>(CoreSiteLogoSiteNameMode.NOTAG);
    readonly showLogo = input(true, { transform: toBoolean });
    readonly site = input<CoreSite | CoreUnauthenticatedSite>();
    readonly logoType = input<CoreSiteLogoType>(CoreSiteLogoType.LOGIN);

    readonly showLogoEffective = computed(() => {
        const site = this.siteEffective();
        const logoType = this.logoType();
        const showLogo = this.showLogo();
        const logoError = this.logoError();
        const hideOnError = this.hideOnError();
        const siteConfig = this.siteConfig();

        if (!showLogo || (logoType === CoreSiteLogoType.TOP && site.getShowTopLogo(siteConfig) === 'hidden')) {
            return false;
        }

        return !logoError || !hideOnError;
    });

    protected readonly siteConfig = signal<CoreSiteConfig | undefined>(undefined);

    protected readonly siteEffective = computed<CoreSite | CoreUnauthenticatedSite>(() =>
        this.site() ?? CoreSites.getRequiredCurrentSite());

    readonly siteName = signal('');

    readonly showSiteName = computed(() =>
        this.logoType() !== CoreSiteLogoType.TOP || !this.showLogoEffective());

    readonly siteId = computed(() => {
        const site = this.siteEffective();

        if (site instanceof CoreSite) {
            return site.getId();
        }
    });

    readonly siteLogo = signal<string | undefined>(undefined);
    readonly logoLoaded = signal(false);
    readonly logoError = signal(false);
    readonly fallbackLogo = computed(() => this.logoType() === CoreSiteLogoType.TOP
        ? 'assets/img/top_logo.png'
        : 'assets/img/login_logo.png');

    readonly appName = signal(CoreConstants.CONFIG.appname);

    protected updateSiteObserver?: CoreEventObserver;

    constructor() {
        effect(async () => {
            const site = this.siteEffective();
            untracked(() => {
                void this.updateSiteConfig(site);
                void this.loadInfo(site);
            });
        });

    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, async () => {
            const site = this.siteEffective();

            untracked(() => {
                void this.updateSiteConfig(site);
                void this.loadInfo(site);
            });
        }, this.siteId());
    }

    /**
     * Function to handle the image loaded.
     *
     * @param success Whether the image was loaded successfully or not.
     */
    imageLoaded(success: boolean): void {
        this.logoError.set(!success);
    }

    /**
     * Update the site config.
     *
     * @param site The site to update the config from.
     */
    protected async updateSiteConfig(site: CoreSite | CoreUnauthenticatedSite): Promise<void> {
        if (site instanceof CoreSite && this.logoType() === CoreSiteLogoType.TOP) {
            this.siteConfig.set(await CorePromiseUtils.ignoreErrors(site.getConfig()));
        }
    }

    /**
     * Load the site name, config and logo.
     *
     * @param site The site to load the info from.
     */
    protected async loadInfo(site: CoreSite | CoreUnauthenticatedSite): Promise<void> {
        const siteName = await site.getSiteName();
        this.siteName.set(siteName || '');

        if (!this.showLogo() || (this.logoType() === CoreSiteLogoType.TOP && site.getShowTopLogo(this.siteConfig()) === 'hidden')) {
            return;
        }

        // Get the public config to avoid race conditions when retrieving the logo.
        const publicConfig = await CorePromiseUtils.ignoreErrors(site.getPublicConfig());

        this.siteLogo.set(this.logoType() === CoreSiteLogoType.TOP
            ? site.getTopLogoUrl(publicConfig)
            : site.getLogoUrl(publicConfig));

        this.logoError.set(false);
        this.logoLoaded.set(true);
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

const enum CoreSiteLogoType {
    TOP = 'top',
    LOGIN = 'login',
}
