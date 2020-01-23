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

import { Component } from '@angular/core';
import { IonicPage, Platform } from 'ionic-angular';
import { Device } from '@ionic-native/device';
import { CoreAppProvider } from '@providers/app';
import { CoreFileProvider } from '@providers/file';
import { CoreInitDelegate } from '@providers/init';
import { CoreLangProvider } from '@providers/lang';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreSitesProvider } from '@providers/sites';
import { CoreConfigConstants } from '../../../../configconstants';
import { CorePushNotificationsProvider } from '@core/pushnotifications/providers/pushnotifications';

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
    siteVersion?: number;
    fileSystemRoot?: string;
    userAgent?: string;
    deviceOs?: string;
    browserLanguage?: string;
    currentLanguage?: string;
    locationHref?: string;
    deviceType?: string;
    screen?: string;
    networkStatus: string;
    wifiConnection: string;
    cordovaVersion?: string;
    platform?: string;
    osVersion?: string;
    model?: string;
    uuid?: string;
    pushId: string;
    localNotifAvailable: string;
}

/**
 * Page that displays the device information.
 */
@IonicPage({segment: 'core-settings-deviceinfo'})
@Component({
    selector: 'page-core-settings-deviceinfo',
    templateUrl: 'deviceinfo.html',
})
export class CoreSettingsDeviceInfoPage {

    deviceInfo: CoreSettingsDeviceInfo;
    currentLangName: string;
    fsClickable: boolean;
    deviceOSTranslatable: boolean;

    constructor(platform: Platform,
            device: Device,
            appProvider: CoreAppProvider,
            fileProvider: CoreFileProvider,
            initDelegate: CoreInitDelegate,
            langProvider: CoreLangProvider,
            sitesProvider: CoreSitesProvider,
            localNotificationsProvider: CoreLocalNotificationsProvider,
            pushNotificationsProvider: CorePushNotificationsProvider,
            protected utils: CoreUtilsProvider) {

        this.deviceInfo = {
            versionName: CoreConfigConstants.versionname,
            versionCode: CoreConfigConstants.versioncode,
            compilationTime: CoreConfigConstants.compilationtime,
            lastCommit: CoreConfigConstants.lastcommit,
            networkStatus: appProvider.isOnline() ? 'online' : 'offline',
            wifiConnection: appProvider.isWifi() ? 'yes' : 'no',
            localNotifAvailable: localNotificationsProvider.isAvailable() ? 'yes' : 'no',
            pushId: pushNotificationsProvider.getPushId(),
        };

        if (window.location && window.location.href) {
            const url = window.location.href;
            this.deviceInfo.locationHref = url.substr(0, url.indexOf('#'));
        }

        const navigator = window.navigator;
        if (navigator) {
            if (navigator.userAgent) {
                this.deviceInfo.userAgent = navigator.userAgent;
            }

            if (navigator.language) {
                this.deviceInfo.browserLanguage = navigator.language;
            }
        }

        if (device) {
            if (device.cordova) {
                this.deviceInfo.cordovaVersion = device.cordova;
            }
            if (device.platform) {
                this.deviceInfo.platform = device.platform;
            }
            if (device.version) {
                this.deviceInfo.osVersion = device.version;
            }
            if (device.model) {
                this.deviceInfo.model = device.model;
            }
            if (device.uuid) {
                this.deviceInfo.uuid = device.uuid;
            }
        }

        this.deviceOSTranslatable = true;
        if (appProvider.isMobile()) {
            this.deviceInfo.deviceType = platform.is('tablet') ? 'tablet' : 'phone';
            if (appProvider.isAndroid()) {
                this.deviceInfo.deviceOs = 'android';
            } else if (appProvider.isIOS()) {
                this.deviceInfo.deviceOs = 'ios';
            } else {
                const matches = navigator.userAgent.match(/\(([^\)]*)\)/);
                if (matches && matches.length > 1) {
                    this.deviceOSTranslatable = false;
                    this.deviceInfo.deviceOs = matches[1];
                } else {
                    this.deviceInfo.deviceOs = 'unknown';
                }
            }
        } else {
            this.deviceInfo.deviceType = appProvider.isDesktop() ? 'desktop' : 'browser';
            if (appProvider.isLinux()) {
                this.deviceInfo.deviceOs = 'linux';
            } else if (appProvider.isMac()) {
                this.deviceInfo.deviceOs = 'mac';
            } else if (appProvider.isWindows()) {
                this.deviceInfo.deviceOs = 'windows';
            } else {
                const matches = navigator.userAgent.match(/\(([^\)]*)\)/);
                if (matches && matches.length > 1) {
                    this.deviceOSTranslatable = false;
                    this.deviceInfo.deviceOs = matches[1];
                } else {
                    this.deviceInfo.deviceOs = 'unknown';
                }
            }
        }

        langProvider.getCurrentLanguage().then((lang) => {
            this.deviceInfo.currentLanguage =  lang;
            this.currentLangName = CoreConfigConstants.languages[lang];
        });

        if (fileProvider.isAvailable()) {
            fileProvider.getBasePath().then((basepath) => {
                this.deviceInfo.fileSystemRoot = basepath;
                this.fsClickable = fileProvider.usesHTMLAPI();
            });
        }

        if (window.screen) {
            this.deviceInfo.screen = window.innerWidth + 'x' + window.innerHeight +
                ' (' + window.screen.width + 'x' + window.screen.height + ')';
        }

        const currentSite = sitesProvider.getCurrentSite();

        this.deviceInfo.siteUrl = (currentSite && currentSite.getURL()) ||
            (typeof CoreConfigConstants.siteurl == 'string' && CoreConfigConstants.siteurl);
        this.deviceInfo.isPrefixedUrl = !!CoreConfigConstants.siteurl;
        this.deviceInfo.siteId = currentSite && currentSite.getId();
        this.deviceInfo.siteVersion = currentSite && currentSite.getInfo().release;
    }

    /**
     * Copies device info into the clipboard.
     */
    copyInfo(): void {
        this.utils.copyToClipboard(JSON.stringify(this.deviceInfo));
    }

}
