webpackJsonp([11],{

/***/ 1893:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreUserAboutPageModule", function() { return CoreUserAboutPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__about__ = __webpack_require__(2018);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__components_components_module__ = __webpack_require__(388);
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







var CoreUserAboutPageModule = /** @class */ (function () {
    function CoreUserAboutPageModule() {
    }
    CoreUserAboutPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_3__about__["a" /* CoreUserAboutPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_5__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_6__components_components_module__["a" /* CoreUserComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_3__about__["a" /* CoreUserAboutPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], CoreUserAboutPageModule);
    return CoreUserAboutPageModule;
}());

//# sourceMappingURL=about.module.js.map

/***/ }),

/***/ 2018:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreUserAboutPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_platform_browser__ = __webpack_require__(78);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_user__ = __webpack_require__(26);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_helper__ = __webpack_require__(930);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_events__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__providers_sites__ = __webpack_require__(2);
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
 * Page that displays an user about page.
 */
var CoreUserAboutPage = /** @class */ (function () {
    function CoreUserAboutPage(navParams, userProvider, userHelper, domUtils, eventsProvider, sanitizer, sitesProvider, platform) {
        this.userProvider = userProvider;
        this.userHelper = userHelper;
        this.domUtils = domUtils;
        this.eventsProvider = eventsProvider;
        this.sanitizer = sanitizer;
        this.sitesProvider = sitesProvider;
        this.platform = platform;
        this.userLoaded = false;
        this.hasContact = false;
        this.hasDetails = false;
        this.isAndroid = false;
        this.user = {};
        this.userId = navParams.get('userId');
        this.courseId = navParams.get('courseId');
        this.isAndroid = this.platform.is('android');
        this.siteId = this.sitesProvider.getCurrentSite().getId();
    }
    /**
     * View loaded.
     */
    CoreUserAboutPage.prototype.ionViewDidLoad = function () {
        var _this = this;
        this.fetchUser().finally(function () {
            _this.userLoaded = true;
        });
    };
    /**
     * Fetches the user and updates the view.
     */
    CoreUserAboutPage.prototype.fetchUser = function () {
        var _this = this;
        return this.userProvider.getProfile(this.userId, this.courseId).then(function (user) {
            if (user.address) {
                user.address = _this.userHelper.formatAddress(user.address, user.city, user.country);
                user.encodedAddress = _this.sanitizer.bypassSecurityTrustUrl((_this.isAndroid ? 'geo:0,0?q=' : 'http://maps.google.com?q=') + encodeURIComponent(user.address));
            }
            _this.hasContact = user.email || user.phone1 || user.phone2 || user.city || user.country || user.address;
            _this.hasDetails = user.url || user.interests || (user.customfields && user.customfields.length > 0);
            _this.user = user;
            _this.title = user.fullname;
        }).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error, 'core.user.errorloaduser', true);
        });
    };
    /**
     * Refresh the user.
     *
     * @param {any} refresher Refresher.
     */
    CoreUserAboutPage.prototype.refreshUser = function (refresher) {
        var _this = this;
        this.userProvider.invalidateUserCache(this.userId).finally(function () {
            _this.fetchUser().finally(function () {
                _this.eventsProvider.trigger(__WEBPACK_IMPORTED_MODULE_3__providers_user__["a" /* CoreUserProvider */].PROFILE_REFRESHED, {
                    courseId: _this.courseId, userId: _this.userId,
                    user: _this.user
                }, _this.siteId);
                refresher && refresher.complete();
            });
        });
    };
    CoreUserAboutPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-user-about',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/user/pages/about/about.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title><core-format-text [text]="title"></core-format-text></ion-title>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ion-refresher [enabled]="userLoaded" (ionRefresh)="refreshUser($event)">\n        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n    </ion-refresher>\n    <core-loading [hideUntil]="userLoaded">\n        <div *ngIf="user">\n            <ion-item-group *ngIf="hasContact">\n                <ion-item-divider color="light">{{ \'core.user.contact\' | translate}}</ion-item-divider>\n                <ion-item text-wrap *ngIf="user.email">\n                    <h2>{{ \'core.user.email\' | translate }}</h2>\n                    <p><a href="mailto:{{user.email}}" core-link auto-login="no">\n                        <core-format-text [text]="user.email"></core-format-text>\n                    </a></p>\n                </ion-item>\n                <ion-item text-wrap *ngIf="user.phone1">\n                    <h2>{{ \'core.user.phone1\' | translate}}</h2>\n                    <p><a href="tel:{{user.phone1}}" core-link auto-login="no">\n                        <core-format-text [text]="user.phone1"></core-format-text>\n                    </a></p>\n                </ion-item>\n                <ion-item text-wrap *ngIf="user.phone2">\n                    <h2>{{ \'core.user.phone2\' | translate}}</h2>\n                    <p><a href="tel:{{user.phone2}}" core-link auto-login="no">\n                        <core-format-text [text]="user.phone2"></core-format-text>\n                    </a></p>\n                </ion-item>\n                <ion-item text-wrap *ngIf="user.address">\n                    <h2>{{ \'core.user.address\' | translate}}</h2>\n                    <p><a [href]="user.encodedAddress" core-link auto-login="no">\n                            <core-format-text [text]="user.address"></core-format-text>\n                        </a>\n                    </p>\n                </ion-item>\n                <ion-item text-wrap *ngIf="user.city && !user.address">\n                    <h2>{{ \'core.user.city\' | translate}}</h2>\n                    <p><core-format-text [text]="user.city"></core-format-text></p>\n                </ion-item>\n                <ion-item text-wrap *ngIf="user.country && !user.address">\n                    <h2>{{ \'core.user.country\' | translate}}</h2>\n                    <p><core-format-text [text]="user.country"></core-format-text></p>\n                </ion-item>\n            </ion-item-group>\n            <ion-item-group *ngIf="hasDetails">\n                <ion-item-divider color="light">{{ \'core.userdetails\' | translate}}</ion-item-divider>\n                <ion-item text-wrap *ngIf="user.url">\n                    <h2>{{ \'core.user.webpage\' | translate}}</h2>\n                    <p><a href="{{user.url}}" core-link>\n                        <core-format-text [text]="user.url"></core-format-text>\n                    </a></p>\n                </ion-item>\n                <ion-item text-wrap *ngIf="user.interests">\n                    <h2>{{ \'core.user.interests\' | translate}}</h2>\n                    <p><core-format-text [text]="user.interests"></core-format-text></p>\n                </ion-item>\n                <core-user-profile-field *ngFor="let field of user.customfields" [field]="field"></core-user-profile-field>\n            </ion-item-group>\n            <ion-item-group *ngIf="user.description">\n                <ion-item-divider color="light">{{ \'core.user.description\' | translate}}</ion-item-divider>\n                <ion-item text-wrap>\n                    <p><core-format-text [text]="user.description"></core-format-text></p>\n                </ion-item>\n            </ion-item-group>\n        </div>\n        <core-empty-box *ngIf="!user || (!hasContact && !hasDetails && !user.description)" icon="person" [message]=" \'core.user.detailsnotavailable\' | translate"></core-empty-box>\n    </core-loading>'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/user/pages/about/about.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_2_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_3__providers_user__["a" /* CoreUserProvider */], __WEBPACK_IMPORTED_MODULE_4__providers_helper__["a" /* CoreUserHelperProvider */],
            __WEBPACK_IMPORTED_MODULE_5__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_6__providers_events__["a" /* CoreEventsProvider */], __WEBPACK_IMPORTED_MODULE_1__angular_platform_browser__["c" /* DomSanitizer */],
            __WEBPACK_IMPORTED_MODULE_7__providers_sites__["a" /* CoreSitesProvider */], __WEBPACK_IMPORTED_MODULE_2_ionic_angular__["u" /* Platform */]])
    ], CoreUserAboutPage);
    return CoreUserAboutPage;
}());

//# sourceMappingURL=about.js.map

/***/ })

});
//# sourceMappingURL=11.js.map