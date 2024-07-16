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

import { CoreConstants } from '@/core/constants';
import { Component, OnInit } from '@angular/core';
import { FAQ_QRCODE_INFO_DONE, ONBOARDING_DONE } from '@features/login/constants';
import { CoreSettingsHelper } from '@features/settings/services/settings-helper';
import { CoreSitePlugins } from '@features/siteplugins/services/siteplugins';
import { CoreUserTours } from '@features/usertours/services/user-tours';
import { CoreCacheManager } from '@services/cache-manager';
import { CoreConfig } from '@services/config';
import { CoreFile } from '@services/file';
import { CoreNavigator } from '@services/navigator';
import { CorePlatform } from '@services/platform';
import { CoreSites } from '@services/sites';
import { CoreDomUtils, ToastDuration } from '@services/utils/dom';
import { CoreText } from '@singletons/text';

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
    stagingSitesCount = 0;
    enableStagingSites?: boolean;
    previousEnableStagingSites?: boolean;

    disabledFeatures: string[] = [];

    siteId: string | undefined;

    async ngOnInit(): Promise<void> {
        this.rtl = CorePlatform.isRTL;
        this.RTLChanged();

        this.forceSafeAreaMargins = document.documentElement.classList.contains('force-safe-area-margins');
        this.safeAreaChanged();

        this.siteId = CoreSites.getCurrentSite()?.getId();

        this.stagingSitesCount = CoreConstants.CONFIG.sites.filter((site) => site.staging).length;

        if (this.stagingSitesCount) {
            this.enableStagingSites = await CoreSettingsHelper.hasEnabledStagingSites();
            this.previousEnableStagingSites = this.enableStagingSites;
        }

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

        this.disabledFeatures = disabledFeatures?.split(',').filter(feature => feature.trim().length > 0) ?? [];
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
     * Open error log.
     */
    openErrorLog(): void {
        CoreNavigator.navigate('error-log');
    }

    /**
     * Copies site info.
     */
    copyInfo(): void {
        CoreText.copyToClipboard(JSON.stringify({ disabledFeatures: this.disabledFeatures, sitePlugins: this.sitePlugins }));
    }

    /**
     * Reset all user tours.
     */
    async resetUserTours(): Promise<void> {
        await CoreUserTours.resetTours();

        await CoreConfig.delete(ONBOARDING_DONE);
        await CoreConfig.delete(FAQ_QRCODE_INFO_DONE);

        CoreDomUtils.showToast('User tours have been reseted');
    }

    /**
     * Invalidate app caches.
     */
    async invalidateCaches(): Promise<void> {
        const success = await CoreDomUtils.showOperationModals('Invalidating caches', true, async () => {
            await CoreCacheManager.invalidate();

            return true;
        });

        if (!success) {
            return;
        }

        await CoreDomUtils.showToast('Caches invalidated', true, ToastDuration.LONG);
    }

    /**
     * Delete all data from the app.
     */
    async clearFileStorage(): Promise<void> {
        const sites = await CoreSites.getSitesIds();
        await CoreFile.clearDeletedSitesFolder(sites);
        await CoreFile.clearTmpFolder();

        CoreDomUtils.showToast('File storage cleared');
    }

    async setEnabledStagingSites(enabled: boolean): Promise<void> {
        if (this.enableStagingSites === this.previousEnableStagingSites) {
            return;
        }

        try {
            await CoreSettingsHelper.setEnabledStagingSites(enabled);
            this.previousEnableStagingSites = enabled;
        } catch (error) {
            this.enableStagingSites = !enabled;
            CoreDomUtils.showErrorModal(error);
        }
    }

}

// Basic site plugin info.
type CoreSitePluginsBasicInfo = {
    component: string;
    addon: string;
    version: string;
};
