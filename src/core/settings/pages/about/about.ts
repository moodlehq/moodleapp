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

import { Component, } from '@angular/core';
import { IonicPage, Platform } from 'ionic-angular';
import { Device } from '@ionic-native/device';
import { CoreAppProvider } from '@providers/app';
import { CoreFileProvider } from '@providers/file';
import { CoreInitDelegate } from '@providers/init';
import { CoreLangProvider } from '@providers/lang';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreSitesProvider } from '@providers/sites';
import { CoreConfigConstants } from '../../../../configconstants';
import { CorePushNotificationsProvider } from '@core/pushnotifications/providers/pushnotifications';

/**
 * Page that displays the about settings.
 */
@IonicPage({segment: 'core-settings-about'})
@Component({
    selector: 'page-core-settings-about',
    templateUrl: 'about.html',
})
export class CoreSettingsAboutPage {

    appName: string;
    versionName: string;
    versionCode: number;
    compilationTime: number;
    lastCommit: string;
    privacyPolicy: string;
    navigator: Navigator;
    locationHref: string;
    appReady: string;
    deviceType: string;
    deviceOs: string;
    currentLanguage: string;
    networkStatus: string;
    wifiConnection: string;
    deviceWebWorkers: string;
    device: Device;
    fileSystemRoot: string;
    fsClickable: boolean;
    storageType: string;
    localNotifAvailable: string;
    pushId: string;
    siteUrl: string;
    isPrefixedUrl: boolean;

    constructor(platform: Platform, device: Device, appProvider: CoreAppProvider, fileProvider: CoreFileProvider,
            initDelegate: CoreInitDelegate, langProvider: CoreLangProvider, sitesProvider: CoreSitesProvider,
            localNotificationsProvider: CoreLocalNotificationsProvider, pushNotificationsProvider: CorePushNotificationsProvider) {

        const currentSite = sitesProvider.getCurrentSite();

        this.appName = appProvider.isDesktop() ? CoreConfigConstants.desktopappname : CoreConfigConstants.appname;
        this.versionName = CoreConfigConstants.versionname;
        this.versionCode = CoreConfigConstants.versioncode;
        this.compilationTime = CoreConfigConstants.compilationtime;
        this.lastCommit = CoreConfigConstants.lastcommit;

        // Calculate the privacy policy to use.
        this.privacyPolicy = (currentSite && (currentSite.getStoredConfig('tool_mobile_apppolicy') ||
                currentSite.getStoredConfig('sitepolicy'))) || CoreConfigConstants.privacypolicy;

        this.navigator = window.navigator;
        if (window.location && window.location.href) {
            const url = window.location.href;
            this.locationHref = url.substr(0, url.indexOf('#'));
        }

        this.appReady = initDelegate.isReady() ? 'core.yes' : 'core.no';
        this.deviceType = platform.is('tablet') ? 'core.tablet' : 'core.phone';

        if (platform.is('android')) {
            this.deviceOs = 'core.android';
        } else if (platform.is('ios')) {
            this.deviceOs = 'core.ios';
        } else if (platform.is('windows')) {
            this.deviceOs = 'core.windowsphone';
        } else {
            const matches = navigator.userAgent.match(/\(([^\)]*)\)/);
            if (matches && matches.length > 1) {
                this.deviceOs = matches[1];
            } else {
                this.deviceOs = 'core.unknown';
            }
        }

        langProvider.getCurrentLanguage().then((lang) => {
            this.currentLanguage = lang;
        });

        this.networkStatus = appProvider.isOnline() ? 'core.online' : 'core.offline';
        this.wifiConnection = appProvider.isWifi() ? 'core.yes' : 'core.no';
        this.deviceWebWorkers = !!window['Worker'] && !!window['URL'] ? 'core.yes' : 'core.no';
        this.device = device;

        if (fileProvider.isAvailable()) {
            fileProvider.getBasePath().then((basepath) => {
                this.fileSystemRoot = basepath;
                this.fsClickable = fileProvider.usesHTMLAPI();
            });
        }

        this.localNotifAvailable = localNotificationsProvider.isAvailable() ? 'core.yes' : 'core.no';
        this.pushId = pushNotificationsProvider.getPushId();

        this.siteUrl = (currentSite && currentSite.getURL()) ||
            (typeof CoreConfigConstants.siteurl == 'string' && CoreConfigConstants.siteurl);
        this.isPrefixedUrl = !!CoreConfigConstants.siteurl;
    }
}
