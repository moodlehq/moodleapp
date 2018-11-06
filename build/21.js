webpackJsonp([21],{

/***/ 1888:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreSettingsAboutPageModule", function() { return CoreSettingsAboutPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__about__ = __webpack_require__(2013);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__pipes_pipes_module__ = __webpack_require__(67);
// (C) Copyright 2015 Martin Dougiamas
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};







var CoreSettingsAboutPageModule = /** @class */ (function () {
    function CoreSettingsAboutPageModule() {
    }
    CoreSettingsAboutPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_3__about__["a" /* CoreSettingsAboutPage */]
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_6__pipes_pipes_module__["a" /* CorePipesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_3__about__["a" /* CoreSettingsAboutPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], CoreSettingsAboutPageModule);
    return CoreSettingsAboutPageModule;
}());

//# sourceMappingURL=about.module.js.map

/***/ }),

/***/ 2013:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreSettingsAboutPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ionic_native_device__ = __webpack_require__(392);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_app__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_file__ = __webpack_require__(27);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_init__ = __webpack_require__(94);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_lang__ = __webpack_require__(93);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__providers_local_notifications__ = __webpack_require__(80);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__configconstants__ = __webpack_require__(73);
// (C) Copyright 2015 Martin Dougiamas
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};










/**
 * Page that displays the about settings.
 */
var CoreSettingsAboutPage = /** @class */ (function () {
    function CoreSettingsAboutPage(platform, device, appProvider, fileProvider, initDelegate, langProvider, sitesProvider, localNotificationsProvider) {
        var _this = this;
        var currentSite = sitesProvider.getCurrentSite();
        this.appName = appProvider.isDesktop() ? __WEBPACK_IMPORTED_MODULE_9__configconstants__["a" /* CoreConfigConstants */].desktopappname : __WEBPACK_IMPORTED_MODULE_9__configconstants__["a" /* CoreConfigConstants */].appname;
        this.versionName = __WEBPACK_IMPORTED_MODULE_9__configconstants__["a" /* CoreConfigConstants */].versionname;
        this.versionCode = __WEBPACK_IMPORTED_MODULE_9__configconstants__["a" /* CoreConfigConstants */].versioncode;
        this.compilationTime = __WEBPACK_IMPORTED_MODULE_9__configconstants__["a" /* CoreConfigConstants */].compilationtime;
        // Calculate the privacy policy to use.
        this.privacyPolicy = currentSite.getStoredConfig('tool_mobile_apppolicy') || currentSite.getStoredConfig('sitepolicy') ||
            __WEBPACK_IMPORTED_MODULE_9__configconstants__["a" /* CoreConfigConstants */].privacypolicy;
        this.navigator = window.navigator;
        if (window.location && window.location.href) {
            var url = window.location.href;
            this.locationHref = url.substr(0, url.indexOf('#'));
        }
        this.appReady = initDelegate.isReady() ? 'core.yes' : 'core.no';
        this.deviceType = platform.is('tablet') ? 'core.tablet' : 'core.phone';
        if (platform.is('android')) {
            this.deviceOs = 'core.android';
        }
        else if (platform.is('ios')) {
            this.deviceOs = 'core.ios';
        }
        else if (platform.is('windows')) {
            this.deviceOs = 'core.windowsphone';
        }
        else {
            var matches = navigator.userAgent.match(/\(([^\)]*)\)/);
            if (matches && matches.length > 1) {
                this.deviceOs = matches[1];
            }
            else {
                this.deviceOs = 'core.unknown';
            }
        }
        langProvider.getCurrentLanguage().then(function (lang) {
            _this.currentLanguage = lang;
        });
        this.networkStatus = appProvider.isOnline() ? 'core.online' : 'core.offline';
        this.wifiConnection = appProvider.isNetworkAccessLimited() ? 'core.no' : 'core.yes';
        this.deviceWebWorkers = !!window['Worker'] && !!window['URL'] ? 'core.yes' : 'core.no';
        this.device = device;
        if (fileProvider.isAvailable()) {
            fileProvider.getBasePath().then(function (basepath) {
                _this.fileSystemRoot = basepath;
                _this.fsClickable = fileProvider.usesHTMLAPI();
            });
        }
        this.localNotifAvailable = localNotificationsProvider.isAvailable() ? 'core.yes' : 'core.no';
    }
    CoreSettingsAboutPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-settings-about',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/settings/pages/about/about.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{ \'core.settings.about\' | translate }}</ion-title>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ion-item text-wrap>\n        <h2>{{ appName }} {{ versionName }}</h2>\n    </ion-item>\n    <ion-item-group>\n        <ion-item-divider text-wrap color="light">\n            {{ \'core.settings.license\' | translate }}\n        </ion-item-divider>\n        <ion-item text-wrap>\n            <h2>Apache 2.0</h2>\n            <p><a href="http://www.apache.org/licenses/LICENSE-2.0" core-link auto-login="no">http://www.apache.org/licenses/LICENSE-2.0</a></p>\n        </ion-item>\n    </ion-item-group>\n    <ion-item-group *ngIf="privacyPolicy">\n        <ion-item-divider text-wrap color="light">\n            {{ \'core.settings.privacypolicy\' | translate }}\n        </ion-item-divider>\n        <ion-item text-wrap>\n            <p><a [href]="privacyPolicy" core-link auto-login="no">{{ privacyPolicy }}</a></p>\n        </ion-item>\n    </ion-item-group>\n    <ion-item-group>\n        <ion-item-divider text-wrap color="light">\n            {{ \'core.settings.deviceinfo\' | translate }}\n        </ion-item-divider>\n        <ion-item text-wrap *ngIf="versionName">\n            <h2>{{ \'core.settings.versionname\' | translate}}</h2>\n            <p>{{ versionName }}</p>\n        </ion-item>\n        <ion-item text-wrap *ngIf="versionCode">\n            <h2>{{ \'core.settings.versioncode\' | translate}}</h2>\n            <p>{{ versionCode }}</p>\n        </ion-item>\n        <ion-item text-wrap *ngIf="compilationTime">\n            <h2>{{ \'core.settings.compilationtime\' | translate }}</h2>\n            <p>{{ compilationTime | coreFormatDate: "LLL Z" }}</p>\n        </ion-item>\n        <ion-item text-wrap *ngIf="fileSystemRoot">\n            <h2>{{ \'core.settings.filesystemroot\' | translate}}</h2>\n            <p><a *ngIf="fsClickable" [href]="fileSystemRoot" core-link auto-login="no">{{ fileSystemRoot }}</a></p>\n            <p *ngIf="!fsClickable">{{ fileSystemRoot }}</p>\n        </ion-item>\n        <ion-item text-wrap *ngIf="navigator && navigator.userAgent">\n            <h2>{{ \'core.settings.navigatoruseragent\' | translate}}</h2>\n            <p>{{ navigator.userAgent }}</p>\n        </ion-item>\n        <ion-item text-wrap *ngIf="navigator && navigator.language">\n            <h2>{{ \'core.settings.navigatorlanguage\' | translate}}</h2>\n            <p>{{ navigator.language }}</p>\n        </ion-item>\n        <ion-item text-wrap *ngIf="locationHref">\n            <h2>{{ \'core.settings.locationhref\' | translate}}</h2>\n            <p>{{ locationHref }}</p>\n        </ion-item>\n        <ion-item text-wrap *ngIf="appReady">\n            <h2>{{ \'core.settings.appready\' | translate}}</h2>\n            <p>{{ appReady | translate }}</p>\n        </ion-item>\n        <ion-item text-wrap *ngIf="deviceType">\n            <h2>{{ \'core.settings.displayformat\' | translate}}</h2>\n            <p>{{ deviceType | translate }}</p>\n        </ion-item>\n        <ion-item text-wrap *ngIf="deviceOs">\n            <h2>{{ \'core.settings.deviceos\' | translate}}</h2>\n            <p>{{ deviceOs | translate }}</p>\n        </ion-item>\n        <ion-item text-wrap *ngIf="currentLanguage">\n            <h2>{{ \'core.settings.currentlanguage\' | translate}}</h2>\n            <p>{{ currentLanguage }}</p>\n        </ion-item>\n        <ion-item text-wrap *ngIf="networkStatus">\n            <h2>{{ \'core.settings.networkstatus\' | translate}}</h2>\n            <p>{{ networkStatus | translate }}</p>\n        </ion-item>\n        <ion-item text-wrap *ngIf="wifiConnection">\n            <h2>{{ \'core.settings.wificonnection\' | translate}}</h2>\n            <p>{{ wifiConnection | translate }}</p>\n        </ion-item>\n        <ion-item text-wrap *ngIf="deviceWebWorkers">\n            <h2>{{ \'core.settings.devicewebworkers\' | translate}}</h2>\n            <p>{{ deviceWebWorkers | translate }}</p>\n        </ion-item>\n        <ion-item text-wrap *ngIf="device && device.cordova">\n            <h2>{{ \'core.settings.cordovaversion\' | translate}}</h2>\n            <p>{{ device.cordova }}</p>\n        </ion-item>\n        <ion-item text-wrap *ngIf="device && device.platform">\n            <h2>{{ \'core.settings.cordovadeviceplatform\' | translate}}</h2>\n            <p>{{ device.platform }}</p>\n        </ion-item>\n        <ion-item text-wrap *ngIf="device && device.version">\n            <h2>{{ \'core.settings.cordovadeviceosversion\' | translate}}</h2>\n            <p>{{ device.version }}</p>\n        </ion-item>\n        <ion-item text-wrap *ngIf="device && device.model">\n            <h2>{{ \'core.settings.cordovadevicemodel\' | translate}}</h2>\n            <p>{{ device.model }}</p>\n        </ion-item>\n        <ion-item text-wrap *ngIf="device && device.uuid">\n            <h2>{{ \'core.settings.cordovadeviceuuid\' | translate}}</h2>\n            <p>{{ device.uuid }}</p>\n        </ion-item>\n        <ion-item text-wrap *ngIf="localNotifAvailable">\n            <h2>{{ \'core.settings.localnotifavailable\' | translate}}</h2>\n            <p>{{ localNotifAvailable | translate }}</p>\n        </ion-item>\n    </ion-item-group>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/settings/pages/about/about.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["u" /* Platform */], __WEBPACK_IMPORTED_MODULE_2__ionic_native_device__["a" /* Device */], __WEBPACK_IMPORTED_MODULE_3__providers_app__["a" /* CoreAppProvider */], __WEBPACK_IMPORTED_MODULE_4__providers_file__["a" /* CoreFileProvider */],
            __WEBPACK_IMPORTED_MODULE_5__providers_init__["a" /* CoreInitDelegate */], __WEBPACK_IMPORTED_MODULE_6__providers_lang__["a" /* CoreLangProvider */], __WEBPACK_IMPORTED_MODULE_8__providers_sites__["a" /* CoreSitesProvider */],
            __WEBPACK_IMPORTED_MODULE_7__providers_local_notifications__["a" /* CoreLocalNotificationsProvider */]])
    ], CoreSettingsAboutPage);
    return CoreSettingsAboutPage;
}());

//# sourceMappingURL=about.js.map

/***/ })

});
//# sourceMappingURL=21.js.map