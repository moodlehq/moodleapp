webpackJsonp([97],{

/***/ 1802:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddonModAssignSubmissionReviewPageModule", function() { return AddonModAssignSubmissionReviewPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__components_components_module__ = __webpack_require__(925);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__submission_review__ = __webpack_require__(1923);
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







var AddonModAssignSubmissionReviewPageModule = /** @class */ (function () {
    function AddonModAssignSubmissionReviewPageModule() {
    }
    AddonModAssignSubmissionReviewPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_6__submission_review__["a" /* AddonModAssignSubmissionReviewPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_3__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_5__components_components_module__["a" /* AddonModAssignComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_6__submission_review__["a" /* AddonModAssignSubmissionReviewPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], AddonModAssignSubmissionReviewPageModule);
    return AddonModAssignSubmissionReviewPageModule;
}());

//# sourceMappingURL=submission-review.module.js.map

/***/ }),

/***/ 1923:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AddonModAssignSubmissionReviewPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__providers_app__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__core_course_providers_course__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_assign__ = __webpack_require__(52);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__components_submission_submission__ = __webpack_require__(396);
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
 * Page that displays a submission.
 */
var AddonModAssignSubmissionReviewPage = /** @class */ (function () {
    function AddonModAssignSubmissionReviewPage(navParams, navCtrl, courseProvider, appProvider, assignProvider) {
        this.navCtrl = navCtrl;
        this.courseProvider = courseProvider;
        this.appProvider = appProvider;
        this.assignProvider = assignProvider;
        this.forceLeave = false; // To allow leaving the page without checking for changes.
        this.moduleId = navParams.get('moduleId');
        this.courseId = navParams.get('courseId');
        this.submitId = navParams.get('submitId');
        this.blindId = navParams.get('blindId');
        this.showGrade = !!navParams.get('showGrade');
    }
    /**
     * Component being initialized.
     */
    AddonModAssignSubmissionReviewPage.prototype.ngOnInit = function () {
        var _this = this;
        this.fetchSubmission().finally(function () {
            _this.loaded = true;
        });
    };
    /**
     * Check if we can leave the page or not.
     *
     * @return {boolean|Promise<void>} Resolved if we can leave it, rejected if not.
     */
    AddonModAssignSubmissionReviewPage.prototype.ionViewCanLeave = function () {
        if (!this.submissionComponent || this.forceLeave) {
            return true;
        }
        // Check if data has changed.
        return this.submissionComponent.canLeave();
    };
    /**
     * User entered the page.
     */
    AddonModAssignSubmissionReviewPage.prototype.ionViewDidEnter = function () {
        this.submissionComponent && this.submissionComponent.ionViewDidEnter();
    };
    /**
     * User left the page.
     */
    AddonModAssignSubmissionReviewPage.prototype.ionViewDidLeave = function () {
        this.submissionComponent && this.submissionComponent.ionViewDidLeave();
    };
    /**
     * Get the submission.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonModAssignSubmissionReviewPage.prototype.fetchSubmission = function () {
        var _this = this;
        return this.assignProvider.getAssignment(this.courseId, this.moduleId).then(function (assignment) {
            _this.assign = assignment;
            _this.title = _this.assign.name;
            _this.blindMarking = _this.assign.blindmarking && !_this.assign.revealidentities;
            return _this.courseProvider.getModuleBasicGradeInfo(_this.moduleId).then(function (gradeInfo) {
                if (gradeInfo) {
                    // Grades can be saved if simple grading.
                    if (gradeInfo.advancedgrading && gradeInfo.advancedgrading[0] &&
                        typeof gradeInfo.advancedgrading[0].method != 'undefined') {
                        var method = gradeInfo.advancedgrading[0].method || 'simple';
                        _this.canSaveGrades = method == 'simple';
                    }
                    else {
                        _this.canSaveGrades = true;
                    }
                }
            });
        });
    };
    /**
     * Refresh all the data.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonModAssignSubmissionReviewPage.prototype.refreshAllData = function () {
        var _this = this;
        var promises = [];
        promises.push(this.assignProvider.invalidateAssignmentData(this.courseId));
        if (this.assign) {
            promises.push(this.assignProvider.invalidateSubmissionData(this.assign.id));
            promises.push(this.assignProvider.invalidateAssignmentUserMappingsData(this.assign.id));
            promises.push(this.assignProvider.invalidateSubmissionStatusData(this.assign.id, this.submitId, this.blindMarking));
        }
        return Promise.all(promises).finally(function () {
            _this.submissionComponent && _this.submissionComponent.invalidateAndRefresh();
            return _this.fetchSubmission();
        });
    };
    /**
     * Refresh the data.
     *
     * @param {any} refresher Refresher.
     */
    AddonModAssignSubmissionReviewPage.prototype.refreshSubmission = function (refresher) {
        this.refreshAllData().finally(function () {
            refresher.complete();
        });
    };
    /**
     * Submit a grade and feedback.
     */
    AddonModAssignSubmissionReviewPage.prototype.submitGrade = function () {
        var _this = this;
        if (this.submissionComponent) {
            this.submissionComponent.submitGrade().then(function () {
                // Grade submitted, leave the view if not in tablet.
                if (!_this.appProvider.isWide()) {
                    _this.forceLeave = true;
                    _this.navCtrl.pop();
                }
            });
        }
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])(__WEBPACK_IMPORTED_MODULE_5__components_submission_submission__["a" /* AddonModAssignSubmissionComponent */]),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_5__components_submission_submission__["a" /* AddonModAssignSubmissionComponent */])
    ], AddonModAssignSubmissionReviewPage.prototype, "submissionComponent", void 0);
    AddonModAssignSubmissionReviewPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-addon-mod-assign-submission-review',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/addon/mod/assign/pages/submission-review/submission-review.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title><core-format-text [text]="title"></core-format-text></ion-title>\n\n        <ion-buttons end></ion-buttons>\n    </ion-navbar>\n\n    <core-navbar-buttons end>\n        <button [hidden]="!canSaveGrades" ion-button button-clear (click)="submitGrade()" [attr.aria-label]="\'core.done\' | translate">\n            {{ \'core.done\' | translate }}\n        </button>\n    </core-navbar-buttons>\n</ion-header>\n<ion-content>\n\n    <ion-refresher [enabled]="loaded" (ionRefresh)="refreshSubmission($event)">\n        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n    </ion-refresher>\n    <core-loading [hideUntil]="loaded">\n        <addon-mod-assign-submission [courseId]="courseId" [moduleId]="moduleId" [submitId]="submitId" [blindId]="blindId" [showGrade]="showGrade"></addon-mod-assign-submission>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/addon/mod/assign/pages/submission-review/submission-review.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */], __WEBPACK_IMPORTED_MODULE_3__core_course_providers_course__["a" /* CoreCourseProvider */],
            __WEBPACK_IMPORTED_MODULE_2__providers_app__["a" /* CoreAppProvider */], __WEBPACK_IMPORTED_MODULE_4__providers_assign__["a" /* AddonModAssignProvider */]])
    ], AddonModAssignSubmissionReviewPage);
    return AddonModAssignSubmissionReviewPage;
}());

//# sourceMappingURL=submission-review.js.map

/***/ })

});
//# sourceMappingURL=97.js.map