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
import {
    ALWAYS_SHOW_LOGIN_FORM,
    ALWAYS_SHOW_LOGIN_FORM_CHANGED,
    FAQ_QRCODE_INFO_DONE,
    ONBOARDING_DONE,
} from '@features/login/constants';
import { CoreSettingsHelper } from '@features/settings/services/settings-helper';
import { CoreUserTours } from '@features/usertours/services/user-tours';
import { CoreCacheManager } from '@services/cache-manager';
import { CoreConfig } from '@services/config';
import { CoreEvents } from '@singletons/events';
import { CoreFile } from '@services/file';
import { CoreNavigator } from '@services/navigator';
import { CorePlatform } from '@services/platform';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreToasts, ToastDuration } from '@services/overlays/toasts';
import { CoreText } from '@singletons/text';
import { CoreAlerts } from '@services/overlays/alerts';

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
    alwaysShowLoginForm = false;

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

    token?: string;
    privateToken?: string;
    filesAccessKey?: string;

    autoLoginTimeBetweenRequests?: number;
    lastAutoLoginTime?: number;

    async ngOnInit(): Promise<void> {
        this.rtl = CorePlatform.isRTL;
        this.RTLChanged();

        this.forceSafeAreaMargins = document.documentElement.classList.contains('force-safe-area-margins');
        this.safeAreaChanged();

        const currentSite = CoreSites.getCurrentSite();
        this.siteId = currentSite?.getId();

        this.stagingSitesCount = CoreConstants.CONFIG.sites.filter((site) => site.staging).length;

        if (this.stagingSitesCount) {
            this.enableStagingSites = await CoreSettingsHelper.hasEnabledStagingSites();
            this.previousEnableStagingSites = this.enableStagingSites;
        }
        this.alwaysShowLoginForm = Boolean(await CoreConfig.get(ALWAYS_SHOW_LOGIN_FORM, 0));

        if (!currentSite) {
            return;
        }

        this.remoteStyles = false;
        this.remoteStylesCount = 0;

        this.pluginStyles = false;
        this.pluginStylesCount = 0;

        this.userToursEnabled = !CoreUserTours.isDisabled();

        const privateToken = currentSite.getPrivateToken();
        const filesAccessKey = currentSite.getFilesAccessKey();
        this.token = '...' + currentSite.getToken().slice(-3);
        this.privateToken = privateToken && ('...' + privateToken.slice(-3));
        this.filesAccessKey = filesAccessKey && ('...' + filesAccessKey.slice(-3));

        this.autoLoginTimeBetweenRequests = await currentSite.getAutoLoginMinTimeBetweenRequests();
        this.lastAutoLoginTime = currentSite.getLastAutoLoginTime();

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

        const { CoreSitePlugins } = await import('@features/siteplugins/services/siteplugins');
        this.sitePlugins = CoreSitePlugins.getCurrentSitePluginList().map((plugin) => ({
            addon: plugin.addon,
            component: plugin.component,
            version: plugin.version,
        }));

        const disabledFeatures = (await currentSite.getPublicConfig())?.tool_mobile_disabledfeatures;

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
     * Called when always show login form is enabled or disabled.
     */
    async alwaysShowLoginFormChanged(): Promise<void> {
        const value = Number(this.alwaysShowLoginForm);
        await CoreConfig.set(ALWAYS_SHOW_LOGIN_FORM, value);
        CoreEvents.trigger(ALWAYS_SHOW_LOGIN_FORM_CHANGED, { value });
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
        CoreText.copyToClipboard(JSON.stringify({
            disabledFeatures: this.disabledFeatures,
            sitePlugins: this.sitePlugins,
            autoLoginTimeBetweenRequests: this.autoLoginTimeBetweenRequests,
            lastAutoLoginTime: this.lastAutoLoginTime,
        }));
    }

    /**
     * Reset all user tours.
     */
    async resetUserTours(): Promise<void> {
        await CoreUserTours.resetTours();

        await CoreConfig.delete(ONBOARDING_DONE);
        await CoreConfig.delete(FAQ_QRCODE_INFO_DONE);

        CoreToasts.show({ message: 'User tours have been reseted' });
    }

    /**
     * Invalidate app caches.
     */
    async invalidateCaches(): Promise<void> {
        const success = await CoreDomUtils.showOperationModals('Invalidating caches', false, async () => {
            await CoreCacheManager.invalidate();

            return true;
        });

        if (!success) {
            return;
        }

        await CoreToasts.show({
                message: 'Caches invalidated',
                duration: ToastDuration.LONG,
            });
    }

    /**
     * Delete all data from the app.
     */
    async clearFileStorage(): Promise<void> {
        const sites = await CoreSites.getSitesIds();
        await CoreFile.clearDeletedSitesFolder(sites);
        await CoreFile.clearTmpFolder();

        CoreToasts.show({ message: 'File storage cleared' });
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
            CoreAlerts.showError(error);
        }
    }

}

// Basic site plugin info.
type CoreSitePluginsBasicInfo = {
    component: string;
    addon: string;
    version: string;
};
