webpackJsonp([109],{

/***/ 1788:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddonCompetencyCompetencySummaryPageModule", function() { return AddonCompetencyCompetencySummaryPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__competencysummary__ = __webpack_require__(1909);
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






var AddonCompetencyCompetencySummaryPageModule = /** @class */ (function () {
    function AddonCompetencyCompetencySummaryPageModule() {
    }
    AddonCompetencyCompetencySummaryPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_5__competencysummary__["a" /* AddonCompetencyCompetencySummaryPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_3__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_5__competencysummary__["a" /* AddonCompetencyCompetencySummaryPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], AddonCompetencyCompetencySummaryPageModule);
    return AddonCompetencyCompetencySummaryPageModule;
}());

//# sourceMappingURL=competencysummary.module.js.map

/***/ }),

/***/ 1909:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AddonCompetencyCompetencySummaryPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_split_view_split_view__ = __webpack_require__(104);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_competency__ = __webpack_require__(158);
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};





/**
 * Page that displays a learning plan.
 */
var AddonCompetencyCompetencySummaryPage = /** @class */ (function () {
    function AddonCompetencyCompetencySummaryPage(navCtrl, navParams, domUtils, svComponent, competencyProvider) {
        this.navCtrl = navCtrl;
        this.domUtils = domUtils;
        this.svComponent = svComponent;
        this.competencyProvider = competencyProvider;
        this.competencyLoaded = false;
        this.competencyId = navParams.get('competencyId');
    }
    /**
     * View loaded.
     */
    AddonCompetencyCompetencySummaryPage.prototype.ionViewDidLoad = function () {
        var _this = this;
        this.fetchCompetency().then(function () {
            _this.competencyProvider.logCompetencyView(_this.competencyId);
        }).finally(function () {
            _this.competencyLoaded = true;
        });
    };
    /**
     * Fetches the competency summary and updates the view.
     *
     * @return {Promise<void>} Promise resolved when done.
     */
    AddonCompetencyCompetencySummaryPage.prototype.fetchCompetency = function () {
        var _this = this;
        return this.competencyProvider.getCompetencySummary(this.competencyId).then(function (competency) {
            _this.competency = competency;
        }).catch(function (message) {
            _this.domUtils.showErrorModalDefault(message, 'Error getting competency summary data.');
        });
    };
    /**
     * Refreshes the competency summary.
     *
     * @param {any} refresher Refresher.
     */
    AddonCompetencyCompetencySummaryPage.prototype.refreshCompetency = function (refresher) {
        var _this = this;
        this.competencyProvider.invalidateCompetencySummary(this.competencyId).finally(function () {
            _this.fetchCompetency().finally(function () {
                refresher.complete();
            });
        });
    };
    /**
     * Opens the summary of a competency.
     *
     * @param {number} competencyId
     */
    AddonCompetencyCompetencySummaryPage.prototype.openCompetencySummary = function (competencyId) {
        // Decide which navCtrl to use. If this page is inside a split view, use the split view's master nav.
        var navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;
        navCtrl.push('AddonCompetencyCompetencySummaryPage', { competencyId: competencyId });
    };
    AddonCompetencyCompetencySummaryPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-addon-competency-competency-summary',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/addon/competency/pages/competencysummary/competencysummary.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title *ngIf="competency">{{ competency.competency.shortname }} <small>{{ competency.competency.idnumber }}</small></ion-title>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ion-refresher [enabled]="competencyLoaded" (ionRefresh)="refreshCompetency($event)">\n        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n    </ion-refresher>\n    <core-loading [hideUntil]="competencyLoaded">\n        <ion-card *ngIf="competency">\n            <ion-item text-wrap *ngIf="competency.competency.description">\n                <core-format-text [text]="competency.competency.description"></core-format-text>\n            </ion-item>\n            <ion-item text-wrap>\n                <strong>{{ \'addon.competency.path\' | translate }}</strong>:\n                {{ competency.comppath.framework.name }}\n                <span *ngFor="let ancestor of competency.comppath.ancestors">\n                    &nbsp;/&nbsp;<a (click)="openCompetencySummary(ancestor.id)">{{ ancestor.name }}</a>\n                </span>\n            </ion-item>\n        </ion-card>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/addon/competency/pages/competencysummary/competencysummary.html"*/,
        }),
        __param(3, Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["N" /* Optional */])()),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_2__providers_utils_dom__["a" /* CoreDomUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_3__components_split_view_split_view__["a" /* CoreSplitViewComponent */], __WEBPACK_IMPORTED_MODULE_4__providers_competency__["a" /* AddonCompetencyProvider */]])
    ], AddonCompetencyCompetencySummaryPage);
    return AddonCompetencyCompetencySummaryPage;
}());

//# sourceMappingURL=competencysummary.js.map

/***/ })

});
//# sourceMappingURL=109.js.map