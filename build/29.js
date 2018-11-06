webpackJsonp([29],{

/***/ 1877:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreLoginReconnectPageModule", function() { return CoreLoginReconnectPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__reconnect__ = __webpack_require__(2002);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__ = __webpack_require__(14);
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






var CoreLoginReconnectPageModule = /** @class */ (function () {
    function CoreLoginReconnectPageModule() {
    }
    CoreLoginReconnectPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_3__reconnect__["a" /* CoreLoginReconnectPage */]
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_3__reconnect__["a" /* CoreLoginReconnectPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ]
        })
    ], CoreLoginReconnectPageModule);
    return CoreLoginReconnectPageModule;
}());

//# sourceMappingURL=reconnect.module.js.map

/***/ }),

/***/ 2002:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreLoginReconnectPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__providers_app__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_helper__ = __webpack_require__(79);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__angular_forms__ = __webpack_require__(20);
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
 * Page to enter the user password to reconnect to a site.
 */
var CoreLoginReconnectPage = /** @class */ (function () {
    function CoreLoginReconnectPage(navCtrl, navParams, fb, appProvider, sitesProvider, loginHelper, domUtils) {
        this.navCtrl = navCtrl;
        this.appProvider = appProvider;
        this.sitesProvider = sitesProvider;
        this.loginHelper = loginHelper;
        this.domUtils = domUtils;
        var currentSite = this.sitesProvider.getCurrentSite();
        this.infoSiteUrl = navParams.get('infoSiteUrl');
        this.pageName = navParams.get('pageName');
        this.pageParams = navParams.get('pageParams');
        this.siteConfig = navParams.get('siteConfig');
        this.siteUrl = navParams.get('siteUrl');
        this.siteId = navParams.get('siteId');
        this.isLoggedOut = currentSite && currentSite.isLoggedOut();
        this.credForm = fb.group({
            password: ['', __WEBPACK_IMPORTED_MODULE_6__angular_forms__["h" /* Validators */].required]
        });
    }
    /**
     * View loaded.
     */
    CoreLoginReconnectPage.prototype.ionViewDidLoad = function () {
        var _this = this;
        if (this.siteConfig) {
            this.identityProviders = this.loginHelper.getValidIdentityProviders(this.siteConfig);
        }
        this.sitesProvider.getSite(this.siteId).then(function (site) {
            _this.site = {
                id: site.id,
                fullname: site.infos.fullname,
                avatar: site.infos.userpictureurl
            };
            _this.username = site.infos.username;
            _this.siteUrl = site.infos.siteurl;
            _this.siteName = site.infos.sitename;
            // Check logoURL if user avatar is not set.
            if (_this.site.avatar.startsWith(site.infos.siteurl + '/theme/image.php')) {
                _this.site.avatar = false;
                return site.getPublicConfig().then(function (config) {
                    _this.logoUrl = config.logourl || config.compactlogourl;
                }).catch(function () {
                    // Ignore errors.
                });
            }
        }).catch(function () {
            // Shouldn't happen. Just leave the view.
            _this.cancel();
        });
    };
    /**
     * Cancel reconnect.
     */
    CoreLoginReconnectPage.prototype.cancel = function () {
        var _this = this;
        this.sitesProvider.logout().finally(function () {
            _this.navCtrl.setRoot('CoreLoginSitesPage');
        });
    };
    /**
     * Tries to authenticate the user.
     */
    CoreLoginReconnectPage.prototype.login = function () {
        var _this = this;
        this.appProvider.closeKeyboard();
        // Get input data.
        var siteUrl = this.siteUrl, username = this.username, password = this.credForm.value.password;
        if (!password) {
            this.domUtils.showErrorModal('core.login.passwordrequired', true);
            return;
        }
        if (!this.appProvider.isOnline()) {
            this.domUtils.showErrorModal('core.networkerrormsg', true);
            return;
        }
        var modal = this.domUtils.showModalLoading();
        // Start the authentication process.
        this.sitesProvider.getUserToken(siteUrl, username, password).then(function (data) {
            return _this.sitesProvider.updateSiteToken(_this.infoSiteUrl, username, data.token, data.privateToken).then(function () {
                // Update site info too because functions might have changed (e.g. unisntall local_mobile).
                return _this.sitesProvider.updateSiteInfoByUrl(_this.infoSiteUrl, username).then(function () {
                    // Reset fields so the data is not in the view anymore.
                    _this.credForm.controls['password'].reset();
                    if (_this.pageName) {
                        // Page defined, go to that page instead of site initial page.
                        return _this.navCtrl.setRoot(_this.pageName, _this.pageParams);
                    }
                    else {
                        return _this.loginHelper.goToSiteInitialPage();
                    }
                }).catch(function (error) {
                    // Error, go back to login page.
                    _this.domUtils.showErrorModalDefault(error, 'core.login.errorupdatesite', true);
                    _this.cancel();
                });
            });
        }).catch(function (error) {
            _this.loginHelper.treatUserTokenError(siteUrl, error);
        }).finally(function () {
            modal.dismiss();
        });
    };
    /**
     * An OAuth button was clicked.
     *
     * @param {any} provider The provider that was clicked.
     */
    CoreLoginReconnectPage.prototype.oauthClicked = function (provider) {
        if (!this.loginHelper.openBrowserForOAuthLogin(this.siteUrl, provider, this.siteConfig.launchurl)) {
            this.domUtils.showErrorModal('Invalid data.');
        }
    };
    CoreLoginReconnectPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-login-reconnect',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/login/pages/reconnect/reconnect.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{ \'core.login.reconnect\' | translate }}</ion-title>\n    </ion-navbar>\n</ion-header>\n<ion-content padding class="core-center-view">\n    <div class="box">\n        <div *ngIf="site" text-wrap text-center margin-bottom [ngClass]="{\'item-avatar-center\': site.avatar}">\n            <ion-avatar *ngIf="site.avatar">\n                <!-- Show user avatar. -->\n                <img [src]="site.avatar" class="avatar" core-external-content [siteId]="site.id" alt="{{ \'core.pictureof\' | translate:{$a: site.fullname} }}" role="presentation" onError="this.src=\'assets/img/user-avatar.png\'">\n            </ion-avatar>\n\n            <!-- Show site logo or a default image. -->\n            <img *ngIf="!site.avatar && logoUrl" [src]="logoUrl" core-external-content [siteId]="site.id" role="presentation">\n            <img *ngIf="!site.avatar && !logoUrl" src="assets/img/login_logo.png" class="login-logo" role="presentation">\n\n            <!-- If no sitename show big siteurl. -->\n            <p *ngIf="!siteName" class="item-heading core-siteurl">{{siteUrl}}</p>\n            <!-- If sitename, show big sitename and small siteurl. -->\n            <p *ngIf="siteName" class="item-heading core-sitename"><core-format-text [text]="siteName"></core-format-text></p>\n            <p *ngIf="siteName" class="core-siteurl">{{siteUrl}}</p>\n\n            <p *ngIf="!isLoggedOut">\n                <ion-icon padding name="alert"></ion-icon> {{ \'core.login.reconnectdescription\' | translate }}\n            </p>\n        </div>\n        <ion-list>\n            <ion-item padding text-wrap class="core-username">\n                <p class="item-heading">{{ \'core.login.username\' | translate }}</p>\n                <p>{{username}}</p>\n            </ion-item>\n            <form [formGroup]="credForm" (ngSubmit)="login()">\n                <ion-item margin-bottom>\n                    <core-show-password item-content [name]="\'password\'">\n                        <ion-input class="core-ioninput-password" name="password" type="password" placeholder="{{ \'core.login.password\' | translate }}" formControlName="password" [clearOnEdit]="false"></ion-input>\n                    </core-show-password>\n                </ion-item>\n                <ion-grid>\n                    <ion-row>\n                        <ion-col>\n                            <a ion-button block color="light" (click)="cancel()">{{ \'core.login.cancel\' | translate }}</a>\n                        </ion-col>\n                        <ion-col>\n                            <button ion-button block [disabled]="!credForm.valid">{{ \'core.login.loginbutton\' | translate }}</button>\n                        </ion-col>\n                    </ion-row>\n                </ion-grid>\n            </form>\n        </ion-list>\n\n        <!-- Identity providers. -->\n        <ion-list *ngIf="identityProviders && identityProviders.length" padding-top>\n            <ion-list-header text-wrap>{{ \'core.login.potentialidps\' | translate }}</ion-list-header>\n            <button ion-item *ngFor="let provider of identityProviders" text-wrap class="core-oauth-icon" (click)="oauthClicked(provider)" title="{{provider.name}}">\n                <img [src]="provider.iconurl" alt="{{provider.name}}" item-start>\n                {{provider.name}}\n            </button>\n        </ion-list>\n    </div>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/login/pages/reconnect/reconnect.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_6__angular_forms__["a" /* FormBuilder */], __WEBPACK_IMPORTED_MODULE_2__providers_app__["a" /* CoreAppProvider */],
            __WEBPACK_IMPORTED_MODULE_3__providers_sites__["a" /* CoreSitesProvider */], __WEBPACK_IMPORTED_MODULE_5__providers_helper__["a" /* CoreLoginHelperProvider */],
            __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__["a" /* CoreDomUtilsProvider */]])
    ], CoreLoginReconnectPage);
    return CoreLoginReconnectPage;
}());

//# sourceMappingURL=reconnect.js.map

/***/ })

});
//# sourceMappingURL=29.js.map