webpackJsonp([34],{

/***/ 1870:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreGradesGradePageModule", function() { return CoreGradesGradePageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__grade__ = __webpack_require__(1995);
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






var CoreGradesGradePageModule = /** @class */ (function () {
    function CoreGradesGradePageModule() {
    }
    CoreGradesGradePageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_3__grade__["a" /* CoreGradesGradePage */]
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_3__grade__["a" /* CoreGradesGradePage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], CoreGradesGradePageModule);
    return CoreGradesGradePageModule;
}());

//# sourceMappingURL=grade.module.js.map

/***/ }),

/***/ 1995:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreGradesGradePage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__providers_grades__ = __webpack_require__(95);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_helper__ = __webpack_require__(116);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_sites__ = __webpack_require__(2);
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
 * Page that displays activity grade.
 */
var CoreGradesGradePage = /** @class */ (function () {
    function CoreGradesGradePage(gradesProvider, domUtils, gradesHelper, navParams, sitesProvider) {
        this.gradesProvider = gradesProvider;
        this.domUtils = domUtils;
        this.gradesHelper = gradesHelper;
        this.gradeLoaded = false;
        this.courseId = navParams.get('courseId');
        this.userId = navParams.get('userId') || sitesProvider.getCurrentSiteUserId();
        this.gradeId = navParams.get('gradeId');
    }
    /**
     * View loaded.
     */
    CoreGradesGradePage.prototype.ionViewDidLoad = function () {
        var _this = this;
        this.fetchData().finally(function () {
            _this.gradeLoaded = true;
        });
    };
    /**
     * Fetch all the data required for the view.
     *
     * @return {Promise<any>} Resolved when done.
     */
    CoreGradesGradePage.prototype.fetchData = function () {
        var _this = this;
        return this.gradesHelper.getGradeItem(this.courseId, this.gradeId, this.userId).then(function (grade) {
            _this.grade = grade;
        }).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error, 'Error loading grade item');
        });
    };
    /**
     * Refresh data.
     *
     * @param {any} refresher Refresher.
     */
    CoreGradesGradePage.prototype.refreshGrade = function (refresher) {
        var _this = this;
        this.gradesProvider.invalidateCourseGradesData(this.courseId, this.userId).finally(function () {
            _this.fetchData().finally(function () {
                refresher.complete();
            });
        });
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])(__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */]),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */])
    ], CoreGradesGradePage.prototype, "content", void 0);
    CoreGradesGradePage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-grades-grade',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/grades/pages/grade/grade.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{ \'core.grades.grade\' | translate }}</ion-title>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ion-refresher [enabled]="gradeLoaded" (ionRefresh)="refreshGrade($event)">\n        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n    </ion-refresher>\n    <core-loading [hideUntil]="gradeLoaded">\n        <core-empty-box *ngIf="!grade" icon="stats" [message]="\'core.grades.nogradesreturned\' | translate"></core-empty-box>\n\n        <ion-list *ngIf="grade">\n            <a ion-item *ngIf="grade.itemname && grade.link" text-wrap detail-push [href]="grade.link" core-link capture="true">\n                <ion-icon *ngIf="grade.icon" name="{{grade.icon}}" item-start></ion-icon>\n                <img *ngIf="grade.image" [src]="grade.image" item-start/>\n                <h2><core-format-text [text]="grade.itemname"></core-format-text></h2>\n            </a>\n\n            <ion-item *ngIf="grade.itemname && !grade.link" text-wrap >\n                <ion-icon *ngIf="grade.icon" name="{{grade.icon}}" item-start></ion-icon>\n                <img *ngIf="grade.image" [src]="grade.image" item-start/>\n                <h2><core-format-text [text]="grade.itemname"></core-format-text></h2>\n            </ion-item>\n\n            <ion-item text-wrap *ngIf="grade.weight">\n                <h2>{{ \'core.grades.weight\' | translate}}</h2>\n                <p><core-format-text [text]="grade.weight"></core-format-text></p>\n            </ion-item>\n\n            <ion-item text-wrap *ngIf="grade.grade">\n                <h2>{{ \'core.grades.grade\' | translate}}</h2>\n                <p><core-format-text [text]="grade.grade"></core-format-text></p>\n            </ion-item>\n\n            <ion-item text-wrap *ngIf="grade.range">\n                <h2>{{ \'core.grades.range\' | translate}}</h2>\n                <p><core-format-text [text]="grade.range"></core-format-text></p>\n            </ion-item>\n\n            <ion-item text-wrap *ngIf="grade.percentage">\n                <h2>{{ \'core.grades.percentage\' | translate}}</h2>\n                <p><core-format-text [text]="grade.percentage"></core-format-text></p>\n            </ion-item>\n\n            <ion-item text-wrap *ngIf="grade.lettergrade">\n                <h2>{{ \'core.grades.lettergrade\' | translate}}</h2>\n                <p><core-format-text [text]="grade.lettergrade"></core-format-text></p>\n            </ion-item>\n\n            <ion-item text-wrap *ngIf="grade.rank">\n                <h2>{{ \'core.grades.rank\' | translate}}</h2>\n                <p><core-format-text [text]="grade.rank"></core-format-text></p>\n            </ion-item>\n\n            <ion-item text-wrap *ngIf="grade.average">\n                <h2>{{ \'core.grades.average\' | translate}}</h2>\n                <p><core-format-text [text]="grade.average"></core-format-text></p>\n            </ion-item>\n\n            <ion-item text-wrap *ngIf="grade.feedback">\n                <h2>{{ \'core.grades.feedback\' | translate}}</h2>\n                <p><core-format-text [fullTitle]="\'core.grades.feedback\' | translate" maxHeight="60" fullOnClick="true" [text]="grade.feedback"></core-format-text></p>\n            </ion-item>\n\n            <ion-item text-wrap *ngIf="grade.contributiontocoursetotal">\n                <h2>{{ \'core.grades.contributiontocoursetotal\' | translate}}</h2>\n                <p><core-format-text [text]="grade.contributiontocoursetotal"></core-format-text></p>\n            </ion-item>\n        </ion-list>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/grades/pages/grade/grade.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_2__providers_grades__["a" /* CoreGradesProvider */], __WEBPACK_IMPORTED_MODULE_3__providers_utils_dom__["a" /* CoreDomUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_4__providers_helper__["a" /* CoreGradesHelperProvider */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_5__providers_sites__["a" /* CoreSitesProvider */]])
    ], CoreGradesGradePage);
    return CoreGradesGradePage;
}());

//# sourceMappingURL=grade.js.map

/***/ })

});
//# sourceMappingURL=34.js.map