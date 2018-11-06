webpackJsonp([24],{

/***/ 1880:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreLoginSitesPageModule", function() { return CoreLoginSitesPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__sites__ = __webpack_require__(2005);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__ = __webpack_require__(14);
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





var CoreLoginSitesPageModule = /** @class */ (function () {
    function CoreLoginSitesPageModule() {
    }
    CoreLoginSitesPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_3__sites__["a" /* CoreLoginSitesPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_3__sites__["a" /* CoreLoginSitesPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], CoreLoginSitesPageModule);
    return CoreLoginSitesPageModule;
}());

//# sourceMappingURL=sites.module.js.map

/***/ }),

/***/ 2005:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreLoginSitesPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__providers_logger__ = __webpack_require__(7);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_utils_text__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__addon_pushnotifications_providers_pushnotifications__ = __webpack_require__(249);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__providers_helper__ = __webpack_require__(79);
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
 * Page that displays the list of stored sites.
 */
var CoreLoginSitesPage = /** @class */ (function () {
    function CoreLoginSitesPage(domUtils, textUtils, sitesProvider, loginHelper, logger, translate, pushNotificationsProvider) {
        this.domUtils = domUtils;
        this.textUtils = textUtils;
        this.sitesProvider = sitesProvider;
        this.loginHelper = loginHelper;
        this.translate = translate;
        this.pushNotificationsProvider = pushNotificationsProvider;
        this.logger = logger.getInstance('CoreLoginSitesPage');
    }
    /**
     * View loaded.
     */
    CoreLoginSitesPage.prototype.ionViewDidLoad = function () {
        var _this = this;
        this.sitesProvider.getSortedSites().then(function (sites) {
            // Remove protocol from the url to show more url text.
            _this.sites = sites.map(function (site) {
                site.siteUrl = site.siteUrl.replace(/^https?:\/\//, '');
                site.badge = 0;
                _this.pushNotificationsProvider.getSiteCounter(site.id).then(function (counter) {
                    site.badge = counter;
                });
                return site;
            });
            _this.showDelete = false;
        }).catch(function () {
            // Shouldn't happen.
        });
    };
    /**
     * Go to the page to add a site.
     */
    CoreLoginSitesPage.prototype.add = function () {
        this.loginHelper.goToAddSite(false, true);
    };
    /**
     * Delete a site.
     *
     * @param {Event} e Click event.
     * @param {number} index Position of the site.
     */
    CoreLoginSitesPage.prototype.deleteSite = function (e, index) {
        var _this = this;
        e.stopPropagation();
        var site = this.sites[index], siteName = site.siteName;
        this.textUtils.formatText(siteName).then(function (siteName) {
            _this.domUtils.showConfirm(_this.translate.instant('core.login.confirmdeletesite', { sitename: siteName })).then(function () {
                _this.sitesProvider.deleteSite(site.id).then(function () {
                    _this.sites.splice(index, 1);
                    _this.showDelete = false;
                    // If there are no sites left, go to add site.
                    _this.sitesProvider.hasSites().then(function (hasSites) {
                        if (!hasSites) {
                            _this.loginHelper.goToAddSite(true, true);
                        }
                    });
                }).catch(function (error) {
                    _this.logger.error('Error deleting site ' + site.id, error);
                    _this.domUtils.showErrorModalDefault(error, 'Delete site failed.');
                    _this.domUtils.showErrorModal('core.login.errordeletesite', true);
                });
            }).catch(function () {
                // User cancelled, nothing to do.
            });
        });
    };
    /**
     * Login in a site.
     *
     * @param {string} siteId The site ID.
     */
    CoreLoginSitesPage.prototype.login = function (siteId) {
        var _this = this;
        var modal = this.domUtils.showModalLoading();
        this.sitesProvider.loadSite(siteId).then(function () {
            if (!_this.loginHelper.isSiteLoggedOut()) {
                return _this.loginHelper.goToSiteInitialPage();
            }
        }).catch(function (error) {
            _this.logger.error('Error loading site ' + siteId, error);
            _this.domUtils.showErrorModalDefault(error, 'Error loading site.');
        }).finally(function () {
            modal.dismiss();
        });
    };
    /**
     * Toggle delete.
     */
    CoreLoginSitesPage.prototype.toggleDelete = function () {
        this.showDelete = !this.showDelete;
    };
    CoreLoginSitesPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-login-sites',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/login/pages/sites/sites.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{ \'core.settings.sites\' | translate }}</ion-title>\n\n        <ion-buttons end>\n            <button *ngIf="sites && sites.length > 0" ion-button icon-only (click)="toggleDelete()" [attr.aria-label]="\'core.delete\' | translate">\n                <ion-icon name="create" ios="md-create"></ion-icon>\n            </button>\n        </ion-buttons>\n    </ion-navbar>\n</ion-header>\n<ion-content class="has-fab">\n    <ion-list>\n        <a ion-item (click)="login(site.id)" *ngFor="let site of sites; let idx = index" detail-none>\n            <ion-avatar item-start>\n                <img [src]="site.avatar" core-external-content [siteId]="site.id" alt="{{ \'core.pictureof\' | translate:{$a: site.fullname} }}" role="presentation" onError="this.src=\'assets/img/user-avatar.png\'">\n            </ion-avatar>\n            <h2>{{site.fullName}}</h2>\n            <p><core-format-text [text]="site.siteName" clean="true" [siteId]="site.id"></core-format-text></p>\n            <p>{{site.siteUrl}}</p>\n            <ion-badge item-end *ngIf="!showDelete && site.badge">{{site.badge}}</ion-badge>\n            <button *ngIf="showDelete" item-end ion-button icon-only clear color="danger" (click)="deleteSite($event, idx)" [attr.aria-label]="\'core.delete\' | translate">\n                <ion-icon name="trash"></ion-icon>\n            </button>\n        </a>\n    </ion-list>\n    <ion-fab bottom end>\n        <button ion-fab (click)="add()" [attr.aria-label]="\'core.add\' | translate">\n            <ion-icon name="add"></ion-icon>\n        </button>\n    </ion-fab>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/login/pages/sites/sites.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_5__providers_utils_text__["a" /* CoreTextUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_3__providers_sites__["a" /* CoreSitesProvider */], __WEBPACK_IMPORTED_MODULE_7__providers_helper__["a" /* CoreLoginHelperProvider */], __WEBPACK_IMPORTED_MODULE_2__providers_logger__["a" /* CoreLoggerProvider */],
            __WEBPACK_IMPORTED_MODULE_1__ngx_translate_core__["c" /* TranslateService */], __WEBPACK_IMPORTED_MODULE_6__addon_pushnotifications_providers_pushnotifications__["a" /* AddonPushNotificationsProvider */]])
    ], CoreLoginSitesPage);
    return CoreLoginSitesPage;
}());

//# sourceMappingURL=sites.js.map

/***/ })

});
//# sourceMappingURL=24.js.map