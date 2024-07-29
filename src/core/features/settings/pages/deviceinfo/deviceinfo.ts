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

import { Component, OnDestroy } from '@angular/core';
import { CoreConstants } from '@/core/constants';
import { CoreLocalNotifications } from '@services/local-notifications';
import { Device, Translate, NgZone } from '@singletons';
import { CoreLang } from '@services/lang';
import { CoreFile } from '@services/file';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { Subscription } from 'rxjs';
import { CorePushNotifications } from '@features/pushnotifications/services/pushnotifications';
import { CoreConfig } from '@services/config';
import { CoreToasts } from '@services/toasts';
import { CoreNavigator } from '@services/navigator';
import { CorePlatform } from '@services/platform';
import { CoreNetwork } from '@services/network';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreSitesFactory } from '@services/sites-factory';
import { CoreText } from '@singletons/text';

/**
 * Device Info to be shown and copied to clipboard.
 */
interface CoreSettingsDeviceInfo {
    versionName: string;
    versionCode: number;
    compilationTime: number;
    lastCommit: string;
    siteUrl?: string;
    isPrefixedUrl?: boolean;
    siteId?: string;
    siteVersion?: string;
    fileSystemRoot?: string;
    userAgent?: string;
    deviceOs?: string;
    browserLanguage?: string;
    currentLanguage?: string;
    locationHref?: string;
    deviceType: string;
    screen?: string;
    networkStatus: string;
    wifiConnection: string;
    cordovaVersion?: string;
    platform?: string;
    osVersion?: string;
    model?: string;
    uuid?: string;
    pushId?: string;
    localNotifAvailable: string;
    encryptedPushSupported?: boolean;
}

/**
 * Page that displays the device information.
 */
@Component({
    selector: 'page-core-app-settings-deviceinfo',
    templateUrl: 'deviceinfo.html',
    styleUrls: ['deviceinfo.scss'],
})
export class CoreSettingsDeviceInfoPage implements OnDestroy {

    deviceInfo: CoreSettingsDeviceInfo;
    deviceOsTranslated?: string;
    currentLangName?: string;
    fsClickable = false;
    showDevOptions = false;
    displaySiteUrl = false;
    protected devOptionsClickCounter = 0;
    protected devOptionsForced = false;
    protected devOptionsClickTimeout?: number;

    protected onlineObserver?: Subscription;

    constructor() {
        const navigator = window.navigator;

        this.deviceInfo = {
            versionName: CoreConstants.CONFIG.versionname,
            versionCode: CoreConstants.CONFIG.versioncode,
            compilationTime: CoreConstants.BUILD.compilationTime || 0,
            lastCommit: CoreConstants.BUILD.lastCommitHash || '',
            networkStatus: CoreNetwork.isOnline() ? 'online' : 'offline',
            wifiConnection: CoreNetwork.isWifi() ? 'yes' : 'no',
            localNotifAvailable: CoreLocalNotifications.isPluginAvailable() ? 'yes' : 'no',
            pushId: CorePushNotifications.getPushId(),
            deviceType: '',
        };

        if (window.location && window.location.href) {
            const url = window.location.href;
            this.deviceInfo.locationHref = url.indexOf('#') > 0 ? url.substring(0, url.indexOf('#')) : url;
        }

        if (window.screen) {
            this.deviceInfo.screen = window.innerWidth + 'x' + window.innerHeight +
                ' (' + window.screen.width + 'x' + window.screen.height + ')';
        }

        if (CorePlatform.isMobile()) {
            this.deviceInfo.deviceType = CorePlatform.is('tablet') ? 'tablet' : 'phone';
            if (CorePlatform.isAndroid()) {
                this.deviceInfo.deviceOs = 'android';
                this.deviceOsTranslated = 'Android';
            } else if (CorePlatform.isIOS()) {
                this.deviceInfo.deviceOs = 'ios';
                this.deviceOsTranslated = 'iOS';
            } else {
                const matches = navigator.userAgent.match(/\(([^)]*)\)/);
                if (matches && matches.length > 1) {
                    this.deviceInfo.deviceOs = matches[1];
                    this.deviceOsTranslated = matches[1];
                } else {
                    this.deviceInfo.deviceOs = 'unknown';
                    this.deviceOsTranslated = Translate.instant('core.unknown');
                }
            }
        } else {
            this.deviceInfo.deviceType = 'browser';
            const matches = navigator.userAgent.match(/\(([^)]*)\)/);
            if (matches && matches.length > 1) {
                this.deviceInfo.deviceOs = matches[1];
                this.deviceOsTranslated = matches[1];
            } else {
                this.deviceInfo.deviceOs = 'unknown';
                this.deviceOsTranslated = Translate.instant('core.unknown');
            }
        }

        if (navigator.userAgent) {
            this.deviceInfo.userAgent = navigator.userAgent;
        }

        if (navigator.language) {
            this.deviceInfo.browserLanguage = navigator.language;
        }

        if (Device.cordova) {
            this.deviceInfo.cordovaVersion = Device.cordova;
        }
        if (Device.platform) {
            this.deviceInfo.platform = Device.platform;
        }
        if (Device.version) {
            this.deviceInfo.osVersion = Device.version;
        }
        if (Device.model) {
            this.deviceInfo.model = Device.model;
        }
        if (Device.uuid) {
            this.deviceInfo.uuid = Device.uuid;
        }

        const currentSite = CoreSites.getCurrentSite();
        this.deviceInfo.siteId = currentSite?.getId();
        this.deviceInfo.siteVersion = currentSite?.getInfo()?.release;

        // Refresh online status when changes.
        this.onlineObserver = CoreNetwork.onChange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.run(() => {
                this.deviceInfo.networkStatus = CoreNetwork.isOnline() ? 'online' : 'offline';
            });
        });

        this.asyncInit();
    }

    /**
     * Async part of the constructor.
     */
    protected async asyncInit(): Promise<void> {
        const lang = await CoreLang.getCurrentLanguage();
        this.deviceInfo.currentLanguage = lang;
        this.currentLangName = CoreConstants.CONFIG.languages[lang];

        const currentSite = CoreSites.getCurrentSite();
        const isSingleFixedSite = await CoreLoginHelper.isSingleFixedSite();
        const sites = await CoreLoginHelper.getAvailableSites();
        const firstUrl = isSingleFixedSite && sites[0].url;

        this.deviceInfo.siteUrl = currentSite?.getURL() || firstUrl || undefined;
        this.deviceInfo.isPrefixedUrl = !!sites.length;
        this.displaySiteUrl = !!this.deviceInfo.siteUrl &&
            (currentSite ?? CoreSitesFactory.makeUnauthenticatedSite(this.deviceInfo.siteUrl)).shouldDisplayInformativeLinks();

        if (CoreFile.isAvailable()) {
            const basepath = await CoreFile.getBasePath();
            this.deviceInfo.fileSystemRoot = basepath;
            this.fsClickable = CoreFile.usesHTMLAPI();
        }

        const showDevOptionsOnConfig = await CoreConfig.get('showDevOptions', 0);
        this.devOptionsForced = CoreConstants.enableDevTools();
        this.showDevOptions = this.devOptionsForced || showDevOptionsOnConfig == 1;

        const publicKey = this.deviceInfo.pushId ?
            await CoreUtils.ignoreErrors(CorePushNotifications.getPublicKey()) :
            undefined;
        this.deviceInfo.encryptedPushSupported = publicKey !== undefined;
    }

    /**
     * Copies device info into the clipboard.
     */
    copyInfo(): void {
        CoreText.copyToClipboard(JSON.stringify(this.deviceInfo));
    }

    /**
     * Copies device info item into the clipboard.
     *
     * @param e Event.
     */
    copyItemInfo(e: Event): void {
        const el = <Element>e.target;
        const text = el?.closest('ion-item')?.textContent?.trim();

        text && CoreText.copyToClipboard(text);
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.onlineObserver && this.onlineObserver.unsubscribe();
    }

    /**
     * 5 clicks will enable dev options.
     */
    async enableDevOptions(): Promise<void> {
        if (this.devOptionsForced) {
            return;
        }

        clearTimeout(this.devOptionsClickTimeout);
        this.devOptionsClickCounter++;

        if (this.devOptionsClickCounter == 5) {
            if (!this.showDevOptions) {
                this.showDevOptions = true;
                await CoreConfig.set('showDevOptions', 1);

                CoreToasts.show({
                    message: 'core.settings.youradev',
                    translateMessage: true,
                });
            } else {
                this.showDevOptions = false;
                await CoreConfig.delete('showDevOptions');
            }

            this.devOptionsClickCounter = 0;

            return;
        }

        this.devOptionsClickTimeout = window.setTimeout(() => {
            this.devOptionsClickTimeout = undefined;
            this.devOptionsClickCounter = 0;
        }, 500);
    }

    /**
     * Navigate to dev options.
     */
    gotoDevOptions(): void {
        CoreNavigator.navigate('dev');
    }

}
