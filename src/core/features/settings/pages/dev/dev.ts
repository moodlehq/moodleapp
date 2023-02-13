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

import { Component, OnInit } from '@angular/core';
import { CoreLoginHelperProvider } from '@features/login/services/login-helper';
import { CoreSitePlugins } from '@features/siteplugins/services/siteplugins';
import { CoreUserTours } from '@features/usertours/services/user-tours';
import { CoreConfig } from '@services/config';
import { CorePlatform } from '@services/platform';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';

/**
 * Page that displays the developer options.
 */
@Component({
    selector: 'page-core-app-settings-dev',
    templateUrl: 'dev.html',
})
export class CoreSettingsDevPage implements OnInit {

    rtl = false;
    forceSafeAreaMargins = false;
    direction = 'ltr';

    remoteStyles = true;
    remoteStylesCount = 0;
    pluginStyles = true;
    pluginStylesCount = 0;
    sitePlugins: CoreSitePluginsBasicInfo[] = [];
    userToursEnabled = true;

    disabledFeatures: string[] = [];

    siteId: string | undefined;

    async ngOnInit(): Promise<void> {
        this.rtl = CorePlatform.isRTL;
        this.RTLChanged();

        this.forceSafeAreaMargins = document.documentElement.classList.contains('force-safe-area-margins');
        this.safeAreaChanged();

        this.siteId = CoreSites.getCurrentSite()?.getId();

        if (!this.siteId) {
            return;
        }

        this.remoteStyles = false;
        this.remoteStylesCount = 0;

        this.pluginStyles = false;
        this.pluginStylesCount = 0;

        this.userToursEnabled = !CoreUserTours.isDisabled();

        document.head.querySelectorAll('style').forEach((style) => {
            if (this.siteId && style.id.endsWith(this.siteId)) {
                if (style.innerHTML.length > 0) {
                    this.remoteStylesCount++;
                }
                this.remoteStyles = this.remoteStyles || style.getAttribute('media') != 'disabled';
            }

            if (style.id.startsWith('siteplugin-')) {
                if (style.innerHTML.length > 0) {
                    this.pluginStylesCount++;
                }
                this.pluginStyles = this.pluginStyles || style.getAttribute('media') != 'disabled';
            }
        });

        this.sitePlugins = CoreSitePlugins.getCurrentSitePluginList().map((plugin) => ({
            addon: plugin.addon,
            component: plugin.component,
            version: plugin.version,
        }));

        const disabledFeatures = (await CoreSites.getCurrentSite()?.getPublicConfig())?.tool_mobile_disabledfeatures;

        this.disabledFeatures = disabledFeatures?.split(',') || [];
    }

    /**
     * Called when the rtl is enabled or disabled.
     */
    RTLChanged(): void {
        this.direction = this.rtl ? 'rtl' : 'ltr';
        document.dir = this.direction;
    }

    /**
     * Called when safe area margins is enabled or disabled.
     */
    safeAreaChanged(): void {
        document.documentElement.classList.toggle('force-safe-area-margins', this.forceSafeAreaMargins);
    }

    /**
     * Called when remote styles is enabled or disabled.
     */
    remoteStylesChanged(): void {
        document.head.querySelectorAll('style').forEach((style) => {
            if (this.siteId && style.id.endsWith(this.siteId)) {
                if (this.remoteStyles) {
                    style.removeAttribute('media');
                } else {
                    style.setAttribute('media', 'disabled');
                }
            }
        });
    }

    /**
     * Called when remote styles is enabled or disabled.
     */
    pluginStylesChanged(): void {
        document.head.querySelectorAll('style').forEach((style) => {
            if (style.id.startsWith('siteplugin-')) {
                if (this.pluginStyles) {
                    style.removeAttribute('media');
                } else {
                    style.setAttribute('media', 'disabled');
                }
            }
        });
    }

    /**
     * Copies site info.
     */
    copyInfo(): void {
        CoreUtils.copyToClipboard(JSON.stringify({ disabledFeatures: this.disabledFeatures, sitePlugins: this.sitePlugins }));
    }

    /**
     * Reset all user tours.
     */
    async resetUserTours(): Promise<void> {
        await CoreUserTours.resetTours();

        await CoreConfig.delete(CoreLoginHelperProvider.ONBOARDING_DONE);

        CoreDomUtils.showToast('User tours have been reseted');
    }

}

// Basic site plugin info.
type CoreSitePluginsBasicInfo = {
    component: string;
    addon: string;
    version: string;
};
