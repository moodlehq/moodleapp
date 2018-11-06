webpackJsonp([48],{

/***/ 1855:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreContentLinksChooseSitePageModule", function() { return CoreContentLinksChooseSitePageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__choose_site__ = __webpack_require__(1981);
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






var CoreContentLinksChooseSitePageModule = /** @class */ (function () {
    function CoreContentLinksChooseSitePageModule() {
    }
    CoreContentLinksChooseSitePageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_2__choose_site__["a" /* CoreContentLinksChooseSitePage */]
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_2__choose_site__["a" /* CoreContentLinksChooseSitePage */]),
                __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ]
        })
    ], CoreContentLinksChooseSitePageModule);
    return CoreContentLinksChooseSitePageModule;
}());

//# sourceMappingURL=choose-site.module.js.map

/***/ }),

/***/ 1981:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreContentLinksChooseSitePage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_delegate__ = __webpack_require__(33);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_helper__ = __webpack_require__(32);
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
 * Page to display the list of sites to choose one to perform a content link action.
 */
var CoreContentLinksChooseSitePage = /** @class */ (function () {
    function CoreContentLinksChooseSitePage(navCtrl, navParams, contentLinksDelegate, sitesProvider, domUtils, contentLinksHelper) {
        this.navCtrl = navCtrl;
        this.contentLinksDelegate = contentLinksDelegate;
        this.sitesProvider = sitesProvider;
        this.domUtils = domUtils;
        this.contentLinksHelper = contentLinksHelper;
        this.url = navParams.get('url');
    }
    /**
     * Component being initialized.
     */
    CoreContentLinksChooseSitePage.prototype.ngOnInit = function () {
        var _this = this;
        if (!this.url) {
            return this.leaveView();
        }
        // Get the action to perform.
        this.contentLinksDelegate.getActionsFor(this.url).then(function (actions) {
            _this.action = _this.contentLinksHelper.getFirstValidAction(actions);
            if (!_this.action) {
                return Promise.reject(null);
            }
            // Get the sites that can perform the action.
            return _this.sitesProvider.getSites(_this.action.sites).then(function (sites) {
                _this.sites = sites;
            });
        }).catch(function () {
            _this.domUtils.showErrorModal('core.contentlinks.errornosites', true);
            _this.leaveView();
        }).finally(function () {
            _this.loaded = true;
        });
    };
    /**
     * Cancel.
     */
    CoreContentLinksChooseSitePage.prototype.cancel = function () {
        this.leaveView();
    };
    /**
     * Perform the action on a certain site.
     *
     * @param {string} siteId Site ID.
     */
    CoreContentLinksChooseSitePage.prototype.siteClicked = function (siteId) {
        this.action.action(siteId, this.navCtrl);
    };
    /**
     * Cancel and leave the view.
     */
    CoreContentLinksChooseSitePage.prototype.leaveView = function () {
        var _this = this;
        this.sitesProvider.logout().finally(function () {
            _this.navCtrl.setRoot('CoreLoginSitesPage');
        });
    };
    CoreContentLinksChooseSitePage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-content-links-choose-site',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/contentlinks/pages/choose-site/choose-site.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{ \'core.contentlinks.chooseaccount\' | translate }}</ion-title>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <core-loading [hideUntil]="loaded">\n        <ion-list>\n            <ion-item text-wrap>\n                <p class="item-heading">{{ \'core.contentlinks.chooseaccounttoopenlink\' | translate }}</p>\n                <p>{{ url }}</p>\n            </ion-item>\n            <a ion-item *ngFor="let site of sites" (click)="siteClicked(site.id)">\n                <img [src]="site.avatar" item-start>\n                <h2>{{site.fullName}}</h2>\n                <p><core-format-text clean="true" [text]="site.siteName"></core-format-text></p>\n                <p>{{site.siteUrl}}</p>\n            </a>\n            <ion-item>\n                <button ion-button block (click)="cancel()">{{ \'core.login.cancel\' | translate }}</button>\n            </ion-item>\n        </ion-list>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/contentlinks/pages/choose-site/choose-site.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_4__providers_delegate__["a" /* CoreContentLinksDelegate */],
            __WEBPACK_IMPORTED_MODULE_2__providers_sites__["a" /* CoreSitesProvider */], __WEBPACK_IMPORTED_MODULE_3__providers_utils_dom__["a" /* CoreDomUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_5__providers_helper__["a" /* CoreContentLinksHelperProvider */]])
    ], CoreContentLinksChooseSitePage);
    return CoreContentLinksChooseSitePage;
}());

//# sourceMappingURL=choose-site.js.map

/***/ })

});
//# sourceMappingURL=48.js.map