webpackJsonp([107],{

/***/ 1790:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddonCompetencyPlanPageModule", function() { return AddonCompetencyPlanPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__pipes_pipes_module__ = __webpack_require__(67);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__plan__ = __webpack_require__(1911);
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







var AddonCompetencyPlanPageModule = /** @class */ (function () {
    function AddonCompetencyPlanPageModule() {
    }
    AddonCompetencyPlanPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_6__plan__["a" /* AddonCompetencyPlanPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_3__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_5__pipes_pipes_module__["a" /* CorePipesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_6__plan__["a" /* AddonCompetencyPlanPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], AddonCompetencyPlanPageModule);
    return AddonCompetencyPlanPageModule;
}());

//# sourceMappingURL=plan.module.js.map

/***/ }),

/***/ 1911:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AddonCompetencyPlanPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_app__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__components_split_view_split_view__ = __webpack_require__(104);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_competency__ = __webpack_require__(158);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__providers_helper__ = __webpack_require__(391);
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
var AddonCompetencyPlanPage = /** @class */ (function () {
    function AddonCompetencyPlanPage(navCtrl, navParams, translate, appProvider, domUtils, svComponent, competencyProvider, competencyHelperProvider) {
        this.navCtrl = navCtrl;
        this.translate = translate;
        this.appProvider = appProvider;
        this.domUtils = domUtils;
        this.svComponent = svComponent;
        this.competencyProvider = competencyProvider;
        this.competencyHelperProvider = competencyHelperProvider;
        this.planLoaded = false;
        this.planId = navParams.get('planId');
    }
    /**
     * View loaded.
     */
    AddonCompetencyPlanPage.prototype.ionViewDidLoad = function () {
        var _this = this;
        this.fetchLearningPlan().finally(function () {
            _this.planLoaded = true;
        });
    };
    /**
     * Fetches the learning plan and updates the view.
     *
     * @return {Promise<void>} Promise resolved when done.
     */
    AddonCompetencyPlanPage.prototype.fetchLearningPlan = function () {
        var _this = this;
        return this.competencyProvider.getLearningPlan(this.planId).then(function (plan) {
            plan.plan.statusname = _this.getStatusName(plan.plan.status);
            // Get the user profile image.
            _this.competencyHelperProvider.getProfile(plan.plan.userid).then(function (user) {
                _this.user = user;
            });
            _this.plan = plan;
        }).catch(function (message) {
            _this.domUtils.showErrorModalDefault(message, 'Error getting learning plan data.');
        });
    };
    /**
     * Navigates to a particular competency.
     *
     * @param {number} competencyId
     */
    AddonCompetencyPlanPage.prototype.openCompetency = function (competencyId) {
        var navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;
        if (this.appProvider.isWide()) {
            navCtrl.push('AddonCompetencyCompetenciesPage', { competencyId: competencyId, planId: this.planId });
        }
        else {
            navCtrl.push('AddonCompetencyCompetencyPage', { competencyId: competencyId, planId: this.planId });
        }
    };
    /**
     * Convenience function to get the status name translated.
     *
     * @param {number} status
     * @return {string}
     */
    AddonCompetencyPlanPage.prototype.getStatusName = function (status) {
        var statusTranslateName;
        switch (status) {
            case __WEBPACK_IMPORTED_MODULE_6__providers_competency__["a" /* AddonCompetencyProvider */].STATUS_DRAFT:
                statusTranslateName = 'draft';
                break;
            case __WEBPACK_IMPORTED_MODULE_6__providers_competency__["a" /* AddonCompetencyProvider */].REVIEW_STATUS_IN_REVIEW:
                statusTranslateName = 'inreview';
                break;
            case __WEBPACK_IMPORTED_MODULE_6__providers_competency__["a" /* AddonCompetencyProvider */].REVIEW_STATUS_WAITING_FOR_REVIEW:
                statusTranslateName = 'waitingforreview';
                break;
            case __WEBPACK_IMPORTED_MODULE_6__providers_competency__["a" /* AddonCompetencyProvider */].STATUS_ACTIVE:
                statusTranslateName = 'active';
                break;
            case __WEBPACK_IMPORTED_MODULE_6__providers_competency__["a" /* AddonCompetencyProvider */].STATUS_COMPLETE:
                statusTranslateName = 'complete';
                break;
            default:
                // We can use the current status name.
                return String(status);
        }
        return this.translate.instant('addon.competency.planstatus' + statusTranslateName);
    };
    /**
     * Refreshes the learning plan.
     *
     * @param {any} refresher Refresher.
     */
    AddonCompetencyPlanPage.prototype.refreshLearningPlan = function (refresher) {
        var _this = this;
        this.competencyProvider.invalidateLearningPlan(this.planId).finally(function () {
            _this.fetchLearningPlan().finally(function () {
                refresher.complete();
            });
        });
    };
    AddonCompetencyPlanPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-addon-competency-plan',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/addon/competency/pages/plan/plan.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title *ngIf="plan">{{plan.plan.name}}</ion-title>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ion-refresher [enabled]="planLoaded" (ionRefresh)="refreshLearningPlan($event)">\n        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n    </ion-refresher>\n    <core-loading [hideUntil]="planLoaded">\n        <ion-card *ngIf="user">\n            <ion-item text-wrap>\n                <ion-avatar *ngIf="user.profileimageurl && user.profileimageurl !== true" item-start>\n                    <img  [src]="user.profileimageurl" [alt]="\'core.pictureof\' | translate:{$a: user.fullname}" core-external-content>\n                </ion-avatar>\n                <span *ngIf="user.profileimageurl === true" item-start>\n                    <ion-icon name="person"></ion-icon>\n                </span>\n                <h2><core-format-text [text]="user.fullname"></core-format-text></h2>\n            </ion-item>\n       </ion-card>\n        <ion-card *ngIf="plan">\n            <ion-list>\n                <ion-item text-wrap>\n                    <strong>{{ \'addon.competency.status\' | translate }}</strong>:\n                    {{ plan.plan.statusname }}\n                </ion-item>\n                <ion-item text-wrap *ngIf="plan.plan.duedate > 0">\n                    <strong>{{ \'addon.competency.duedate\' | translate }}</strong>:\n                    {{ plan.plan.duedate | coreToLocaleString }}\n                </ion-item>\n                <ion-item text-wrap *ngIf="plan.plan.template">\n                    <strong>{{ \'addon.competency.template\' | translate }}</strong>:\n                    {{ plan.plan.template.shortname }}\n                </ion-item>\n                <ion-item text-wrap>\n                    <strong>{{ \'addon.competency.progress\' | translate }}</strong>:\n                    {{ \'addon.competency.xcompetenciesproficientoutofy\' | translate: {$a: {x: plan.proficientcompetencycount, y: plan.competencycount} } }}\n                    <core-progress-bar [progress]="plan.proficientcompetencypercentage" [text]="plan.proficientcompetencypercentageformatted"></core-progress-bar>\n                </ion-item>\n            </ion-list>\n        </ion-card>\n        <ion-card *ngIf="plan">\n            <ion-card-header text-wrap>{{ \'addon.competency.learningplancompetencies\' | translate }}</ion-card-header>\n            <ion-list>\n                <ion-item text-wrap *ngIf="plan.competencycount == 0">\n                    {{ \'addon.competency.nocompetencies\' | translate }}\n                </ion-item>\n                <a ion-item text-wrap *ngFor="let competency of plan.competencies" (click)="openCompetency(competency.competency.id)" [title]="competency.competency.shortname">\n                    {{competency.competency.shortname}} <small>{{competency.competency.idnumber}}</small>\n                    <ion-badge item-end [color]="competency.usercompetency.proficiency ? \'success\' : \'danger\'">{{ competency.usercompetency.gradename }}</ion-badge>\n                </a>\n            </ion-list>\n        </ion-card>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/addon/competency/pages/plan/plan.html"*/,
        }),
        __param(5, Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["N" /* Optional */])()),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["c" /* TranslateService */],
            __WEBPACK_IMPORTED_MODULE_3__providers_app__["a" /* CoreAppProvider */], __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__["a" /* CoreDomUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_5__components_split_view_split_view__["a" /* CoreSplitViewComponent */], __WEBPACK_IMPORTED_MODULE_6__providers_competency__["a" /* AddonCompetencyProvider */],
            __WEBPACK_IMPORTED_MODULE_7__providers_helper__["a" /* AddonCompetencyHelperProvider */]])
    ], AddonCompetencyPlanPage);
    return AddonCompetencyPlanPage;
}());

//# sourceMappingURL=plan.js.map

/***/ })

});
//# sourceMappingURL=107.js.map