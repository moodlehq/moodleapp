webpackJsonp([26],{

/***/ 1878:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreLoginSitePolicyPageModule", function() { return CoreLoginSitePolicyPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__site_policy__ = __webpack_require__(2003);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__ = __webpack_require__(1);
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






var CoreLoginSitePolicyPageModule = /** @class */ (function () {
    function CoreLoginSitePolicyPageModule() {
    }
    CoreLoginSitePolicyPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_2__site_policy__["a" /* CoreLoginSitePolicyPage */]
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_2__site_policy__["a" /* CoreLoginSitePolicyPage */]),
                __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ]
        })
    ], CoreLoginSitePolicyPageModule);
    return CoreLoginSitePolicyPageModule;
}());

//# sourceMappingURL=site-policy.module.js.map

/***/ }),

/***/ 2003:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreLoginSitePolicyPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_utils_mimetype__ = __webpack_require__(68);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_utils_utils__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_helper__ = __webpack_require__(79);
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
 * Page to accept a site policy.
 */
var CoreLoginSitePolicyPage = /** @class */ (function () {
    function CoreLoginSitePolicyPage(navCtrl, navParams, loginHelper, domUtils, sitesProvider, utils, mimeUtils) {
        this.navCtrl = navCtrl;
        this.loginHelper = loginHelper;
        this.domUtils = domUtils;
        this.sitesProvider = sitesProvider;
        this.utils = utils;
        this.mimeUtils = mimeUtils;
        this.siteId = navParams.get('siteId');
    }
    /**
     * View laoded.
     */
    CoreLoginSitePolicyPage.prototype.ionViewDidLoad = function () {
        this.currentSite = this.sitesProvider.getCurrentSite();
        if (!this.currentSite) {
            // Not logged in, stop.
            this.cancel();
            return;
        }
        var currentSiteId = this.currentSite.id;
        this.siteId = this.siteId || currentSiteId;
        if (this.siteId != currentSiteId || !this.currentSite.wsAvailable('core_user_agree_site_policy')) {
            // Not current site or WS not available, stop.
            this.cancel();
            return;
        }
        this.fetchSitePolicy();
    };
    /**
     * Fetch the site policy URL.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    CoreLoginSitePolicyPage.prototype.fetchSitePolicy = function () {
        var _this = this;
        return this.loginHelper.getSitePolicy(this.siteId).then(function (sitePolicy) {
            _this.sitePolicy = sitePolicy;
            // Try to get the mime type.
            return _this.utils.getMimeTypeFromUrl(sitePolicy).then(function (mimeType) {
                var extension = _this.mimeUtils.getExtension(mimeType, sitePolicy);
                _this.showInline = extension == 'html' || extension == 'htm';
            }).catch(function () {
                // Unable to get mime type, assume it's not supported.
                _this.showInline = false;
            }).finally(function () {
                _this.policyLoaded = true;
            });
        }).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error && error.error, 'Error getting site policy.');
            _this.cancel();
        });
    };
    /**
     * Cancel.
     */
    CoreLoginSitePolicyPage.prototype.cancel = function () {
        var _this = this;
        this.sitesProvider.logout().catch(function () {
            // Ignore errors, shouldn't happen.
        }).then(function () {
            _this.navCtrl.setRoot('CoreLoginSitesPage');
        });
    };
    /**
     * Accept the site policy.
     */
    CoreLoginSitePolicyPage.prototype.accept = function () {
        var _this = this;
        var modal = this.domUtils.showModalLoading('core.sending', true);
        this.loginHelper.acceptSitePolicy(this.siteId).then(function () {
            // Success accepting, go to site initial page.
            // Invalidate cache since some WS don't return error if site policy is not accepted.
            return _this.currentSite.invalidateWsCache().catch(function () {
                // Ignore errors.
            }).then(function () {
                return _this.loginHelper.goToSiteInitialPage();
            });
        }).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error.message, 'Error accepting site policy.');
        }).finally(function () {
            modal.dismiss();
        });
    };
    CoreLoginSitePolicyPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-login-site-policy',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/login/pages/site-policy/site-policy.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{ \'core.login.policyagreement\' | translate }}</ion-title>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <core-loading [hideUntil]="policyLoaded">\n        <ion-list>\n            <ion-item text-wrap>\n                {{ \'core.login.policyagree\' | translate }}\n            </ion-item>\n            <ion-item text-wrap>\n                <p><a [href]="sitePolicy" core-link [capture]="false">{{ \'core.login.policyagreementclick\' | translate }}</a></p>\n            </ion-item>\n            <ion-card *ngIf="showInline">\n                <core-iframe [src]="sitePolicy"></core-iframe>\n            </ion-card>\n            <ion-item text-wrap padding>\n                <button ion-button block color="primary" (click)="accept()">{{ \'core.login.policyaccept\' | translate }}</button>\n                <button ion-button block (click)="cancel()">{{ \'core.login.cancel\' | translate }}</button>\n            </ion-item>\n        </ion-list>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/login/pages/site-policy/site-policy.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_6__providers_helper__["a" /* CoreLoginHelperProvider */],
            __WEBPACK_IMPORTED_MODULE_3__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_2__providers_sites__["a" /* CoreSitesProvider */], __WEBPACK_IMPORTED_MODULE_5__providers_utils_utils__["a" /* CoreUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_4__providers_utils_mimetype__["a" /* CoreMimetypeUtilsProvider */]])
    ], CoreLoginSitePolicyPage);
    return CoreLoginSitePolicyPage;
}());

//# sourceMappingURL=site-policy.js.map

/***/ })

});
//# sourceMappingURL=26.js.map