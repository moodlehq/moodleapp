webpackJsonp([18],{

/***/ 1887:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreSettingsSpaceUsagePageModule", function() { return CoreSettingsSpaceUsagePageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__space_usage__ = __webpack_require__(2012);
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







var CoreSettingsSpaceUsagePageModule = /** @class */ (function () {
    function CoreSettingsSpaceUsagePageModule() {
    }
    CoreSettingsSpaceUsagePageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_3__space_usage__["a" /* CoreSettingsSpaceUsagePage */]
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_6__pipes_pipes_module__["a" /* CorePipesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_3__space_usage__["a" /* CoreSettingsSpaceUsagePage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], CoreSettingsSpaceUsagePageModule);
    return CoreSettingsSpaceUsagePageModule;
}());

//# sourceMappingURL=space-usage.module.js.map

/***/ }),

/***/ 2012:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreSettingsSpaceUsagePage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__providers_app__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_filepool__ = __webpack_require__(18);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_utils_text__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_utils_dom__ = __webpack_require__(8);
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
 * Page that displays the space usage settings.
 */
var CoreSettingsSpaceUsagePage = /** @class */ (function () {
    function CoreSettingsSpaceUsagePage(filePoolProvider, sitesProvider, textUtils, translate, domUtils, appProvider) {
        this.filePoolProvider = filePoolProvider;
        this.sitesProvider = sitesProvider;
        this.textUtils = textUtils;
        this.translate = translate;
        this.domUtils = domUtils;
        this.usageLoaded = false;
        this.sites = [];
        this.currentSiteId = '';
        this.totalUsage = 0;
        this.currentSiteId = this.sitesProvider.getCurrentSiteId();
    }
    /**
     * View loaded.
     */
    CoreSettingsSpaceUsagePage.prototype.ionViewDidLoad = function () {
        var _this = this;
        this.fetchData().finally(function () {
            _this.usageLoaded = true;
        });
    };
    /**
     * Convenience function to calculate each site's usage, and the total usage.
     *
     * @return {Promise<any>} Resolved when done.
     */
    CoreSettingsSpaceUsagePage.prototype.calculateSizeUsage = function () {
        var _this = this;
        return this.sitesProvider.getSortedSites().then(function (sites) {
            _this.sites = sites;
            // Get space usage.
            var promises = _this.sites.map(function (siteEntry) {
                return _this.sitesProvider.getSite(siteEntry.id).then(function (site) {
                    return site.getSpaceUsage().then(function (size) {
                        siteEntry.spaceUsage = size;
                    });
                });
            });
            return Promise.all(promises);
        });
    };
    /**
     * Convenience function to calculate total usage.
     */
    CoreSettingsSpaceUsagePage.prototype.calculateTotalUsage = function () {
        var total = 0;
        this.sites.forEach(function (site) {
            if (site.spaceUsage) {
                total += parseInt(site.spaceUsage, 10);
            }
        });
        this.totalUsage = total;
    };
    /**
     * Convenience function to calculate space usage.
     *
     * @return {Promise<any>} Resolved when done.
     */
    CoreSettingsSpaceUsagePage.prototype.fetchData = function () {
        var _this = this;
        var promises = [
            this.calculateSizeUsage().then(function () { return _this.calculateTotalUsage(); }),
        ];
        return Promise.all(promises);
    };
    /**
     * Refresh the data.
     *
     * @param {any} refresher Refresher.
     */
    CoreSettingsSpaceUsagePage.prototype.refreshData = function (refresher) {
        this.fetchData().finally(function () {
            refresher.complete();
        });
    };
    /**
     * Convenience function to update site size, along with total usage.
     *
     * @param {any} site Site object with space usage.
     * @param {number} newUsage New space usage of the site in bytes.
     */
    CoreSettingsSpaceUsagePage.prototype.updateSiteUsage = function (site, newUsage) {
        var oldUsage = site.spaceUsage;
        site.spaceUsage = newUsage;
        this.totalUsage -= oldUsage - newUsage;
    };
    /**
     * Deletes files of a site.
     *
     * @param {any} siteData Site object with space usage.
     */
    CoreSettingsSpaceUsagePage.prototype.deleteSiteFiles = function (siteData) {
        var _this = this;
        this.textUtils.formatText(siteData.siteName).then(function (siteName) {
            var title = _this.translate.instant('core.settings.deletesitefilestitle');
            var message = _this.translate.instant('core.settings.deletesitefiles', { sitename: siteName });
            _this.domUtils.showConfirm(message, title).then(function () {
                return _this.sitesProvider.getSite(siteData.id);
            }).then(function (site) {
                site.deleteFolder().then(function () {
                    _this.filePoolProvider.clearAllPackagesStatus(site.id);
                    _this.filePoolProvider.clearFilepool(site.id);
                    _this.updateSiteUsage(siteData, 0);
                }).catch(function (error) {
                    if (error && error.code === FileError.NOT_FOUND_ERR) {
                        // Not found, set size 0.
                        _this.filePoolProvider.clearAllPackagesStatus(site.id);
                        _this.updateSiteUsage(siteData, 0);
                    }
                    else {
                        // Error, recalculate the site usage.
                        _this.domUtils.showErrorModal('core.settings.errordeletesitefiles', true);
                        site.getSpaceUsage().then(function (size) {
                            _this.updateSiteUsage(siteData, size);
                        });
                    }
                });
            }).catch(function () {
                // Ignore cancelled confirmation modal.
            });
        });
    };
    CoreSettingsSpaceUsagePage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-settings-space-usage',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/settings/pages/space-usage/space-usage.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{ \'core.settings.spaceusage\' | translate }}</ion-title>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ion-refresher [enabled]="usageLoaded" (ionRefresh)="refreshData($event)">\n        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n    </ion-refresher>\n    <core-loading [hideUntil]="usageLoaded">\n        <ion-item *ngFor="let site of sites" [class.core-primary-item]="site.id == currentSiteId">\n            <h2><core-format-text [text]="site.siteName"></core-format-text></h2>\n            <p>{{ site.fullName }}</p>\n            <p item-end>{{ site.spaceUsage | coreBytesToSize }}</p>\n            <button ion-button icon-only clear color="danger" item-end (click)="deleteSiteFiles(site)" [hidden]="!site.spaceUsage > \'0\'" [attr.aria-label]="\'core.settings.deletesitefilestitle\' | translate">\n                <ion-icon name="trash"></ion-icon>\n            </button>\n        </ion-item>\n        <ion-item-divider color="light">\n            <p>{{ \'core.settings.total\' | translate }}</p>\n            <p item-end>{{ totalUsage | coreBytesToSize }}</p>\n        </ion-item-divider>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/settings/pages/space-usage/space-usage.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_3__providers_filepool__["a" /* CoreFilepoolProvider */],
            __WEBPACK_IMPORTED_MODULE_4__providers_sites__["a" /* CoreSitesProvider */], __WEBPACK_IMPORTED_MODULE_5__providers_utils_text__["a" /* CoreTextUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_1__ngx_translate_core__["c" /* TranslateService */], __WEBPACK_IMPORTED_MODULE_6__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_2__providers_app__["a" /* CoreAppProvider */]])
    ], CoreSettingsSpaceUsagePage);
    return CoreSettingsSpaceUsagePage;
}());

//# sourceMappingURL=space-usage.js.map

/***/ })

});
//# sourceMappingURL=18.js.map