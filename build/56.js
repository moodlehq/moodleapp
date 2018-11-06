webpackJsonp([56],{

/***/ 1845:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddonModWorkshopAssessmentPageModule", function() { return AddonModWorkshopAssessmentPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__components_components_module__ = __webpack_require__(389);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__assessment__ = __webpack_require__(1968);
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







var AddonModWorkshopAssessmentPageModule = /** @class */ (function () {
    function AddonModWorkshopAssessmentPageModule() {
    }
    AddonModWorkshopAssessmentPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_6__assessment__["a" /* AddonModWorkshopAssessmentPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_3__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__components_components_module__["a" /* AddonModWorkshopComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_6__assessment__["a" /* AddonModWorkshopAssessmentPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], AddonModWorkshopAssessmentPageModule);
    return AddonModWorkshopAssessmentPageModule;
}());

//# sourceMappingURL=assessment.module.js.map

/***/ }),

/***/ 1968:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AddonModWorkshopAssessmentPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__angular_forms__ = __webpack_require__(20);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_events__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_sync__ = __webpack_require__(45);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__providers_utils_text__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__core_course_providers_course__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__core_user_providers_user__ = __webpack_require__(26);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__core_grades_providers_helper__ = __webpack_require__(116);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12__providers_workshop__ = __webpack_require__(108);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13__providers_helper__ = __webpack_require__(134);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_14__providers_offline__ = __webpack_require__(117);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_15__providers_sync__ = __webpack_require__(250);
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
 * Page that displays a workshop assessment.
 */
var AddonModWorkshopAssessmentPage = /** @class */ (function () {
    function AddonModWorkshopAssessmentPage(navParams, sitesProvider, courseProvider, workshopProvider, workshopOffline, workshopHelper, navCtrl, syncProvider, textUtils, fb, translate, eventsProvider, domUtils, gradesHelper, userProvider) {
        var _this = this;
        this.courseProvider = courseProvider;
        this.workshopProvider = workshopProvider;
        this.workshopOffline = workshopOffline;
        this.workshopHelper = workshopHelper;
        this.navCtrl = navCtrl;
        this.syncProvider = syncProvider;
        this.textUtils = textUtils;
        this.fb = fb;
        this.translate = translate;
        this.eventsProvider = eventsProvider;
        this.domUtils = domUtils;
        this.gradesHelper = gradesHelper;
        this.userProvider = userProvider;
        this.evaluating = false;
        this.loaded = false;
        this.evaluate = {
            text: '',
            grade: -1,
            weight: 1
        };
        this.weights = [];
        this.originalEvaluation = {};
        this.hasOffline = false;
        this.isDestroyed = false;
        this.forceLeave = false;
        this.assessment = navParams.get('assessment');
        this.submission = navParams.get('submission') || {};
        this.profile = navParams.get('profile');
        this.courseId = navParams.get('courseId');
        this.assessmentId = this.assessment.assessmentid || this.assessment.id;
        this.workshopId = this.submission.workshopid || null;
        this.siteId = sitesProvider.getCurrentSiteId();
        this.currentUserId = sitesProvider.getCurrentSiteUserId();
        this.showGrade = this.workshopHelper.showGrade;
        this.evaluateForm = new __WEBPACK_IMPORTED_MODULE_2__angular_forms__["c" /* FormGroup */]({});
        this.evaluateForm.addControl('weight', this.fb.control('', __WEBPACK_IMPORTED_MODULE_2__angular_forms__["h" /* Validators */].required));
        this.evaluateForm.addControl('grade', this.fb.control(''));
        this.evaluateForm.addControl('text', this.fb.control(''));
        // Refresh workshop on sync.
        this.syncObserver = this.eventsProvider.on(__WEBPACK_IMPORTED_MODULE_15__providers_sync__["a" /* AddonModWorkshopSyncProvider */].AUTO_SYNCED, function (data) {
            // Update just when all database is synced.
            if (_this.workshopId === data.workshopId) {
                _this.loaded = false;
                _this.refreshAllData();
            }
        }, this.siteId);
    }
    /**
     * Component being initialized.
     */
    AddonModWorkshopAssessmentPage.prototype.ngOnInit = function () {
        this.fetchAssessmentData();
    };
    /**
     * Check if we can leave the page or not.
     *
     * @return {boolean|Promise<void>} Resolved if we can leave it, rejected if not.
     */
    AddonModWorkshopAssessmentPage.prototype.ionViewCanLeave = function () {
        if (this.forceLeave || !this.evaluating) {
            return true;
        }
        if (!this.hasEvaluationChanged()) {
            return Promise.resolve();
        }
        // Show confirmation if some data has been modified.
        return this.domUtils.showConfirm(this.translate.instant('core.confirmcanceledit'));
    };
    /**
     * Fetch the assessment data.
     *
     * @return {Promise<void>} Resolved when done.
     */
    AddonModWorkshopAssessmentPage.prototype.fetchAssessmentData = function () {
        var _this = this;
        return this.workshopProvider.getWorkshopById(this.courseId, this.workshopId).then(function (workshopData) {
            _this.workshop = workshopData;
            _this.title = _this.workshop.name;
            _this.strategy = _this.workshop.strategy;
            return _this.courseProvider.getModuleBasicGradeInfo(workshopData.coursemodule);
        }).then(function (gradeInfo) {
            _this.maxGrade = gradeInfo.grade;
            return _this.workshopProvider.getWorkshopAccessInformation(_this.workshopId);
        }).then(function (accessData) {
            _this.access = accessData;
            // Load Weights selector.
            if (_this.assessmentId && (accessData.canallocate || accessData.canoverridegrades)) {
                if (!_this.isDestroyed) {
                    // Block the workshop.
                    _this.syncProvider.blockOperation(__WEBPACK_IMPORTED_MODULE_12__providers_workshop__["a" /* AddonModWorkshopProvider */].COMPONENT, _this.workshopId);
                }
                _this.evaluating = true;
            }
            else {
                _this.evaluating = false;
            }
            if (_this.evaluating || _this.workshop.phase == __WEBPACK_IMPORTED_MODULE_12__providers_workshop__["a" /* AddonModWorkshopProvider */].PHASE_CLOSED) {
                // Get all info of the assessment.
                return _this.workshopHelper.getReviewerAssessmentById(_this.workshopId, _this.assessmentId, _this.profile.id)
                    .then(function (assessment) {
                    var defaultGrade, promise;
                    _this.assessment = _this.workshopHelper.realGradeValue(_this.workshop, assessment);
                    _this.evaluate.text = _this.assessment.feedbackreviewer || '';
                    _this.evaluate.weight = _this.assessment.weight;
                    if (_this.evaluating) {
                        if (accessData.canallocate) {
                            _this.weights = [];
                            for (var i = 16; i >= 0; i--) {
                                _this.weights[i] = i;
                            }
                        }
                        if (accessData.canoverridegrades) {
                            defaultGrade = _this.translate.instant('addon.mod_workshop.notoverridden');
                            promise = _this.gradesHelper.makeGradesMenu(_this.workshop.gradinggrade, _this.workshopId, defaultGrade, -1).then(function (grades) {
                                _this.evaluationGrades = grades;
                            });
                        }
                        else {
                            promise = Promise.resolve();
                        }
                        return promise.then(function () {
                            return _this.workshopOffline.getEvaluateAssessment(_this.workshopId, _this.assessmentId)
                                .then(function (offlineAssess) {
                                _this.hasOffline = true;
                                _this.evaluate.weight = offlineAssess.weight;
                                if (accessData.canoverridegrades) {
                                    _this.evaluate.text = offlineAssess.feedbacktext || '';
                                    _this.evaluate.grade = offlineAssess.gradinggradeover || -1;
                                }
                            }).catch(function () {
                                _this.hasOffline = false;
                                // No offline, load online.
                                if (accessData.canoverridegrades) {
                                    _this.evaluate.text = _this.assessment.feedbackreviewer || '';
                                    _this.evaluate.grade = _this.assessment.gradinggradeover || -1;
                                }
                            });
                        }).finally(function () {
                            _this.originalEvaluation.weight = _this.evaluate.weight;
                            if (accessData.canoverridegrades) {
                                _this.originalEvaluation.text = _this.evaluate.text;
                                _this.originalEvaluation.grade = _this.evaluate.grade;
                            }
                            _this.evaluateForm.controls['weight'].setValue(_this.evaluate.weight);
                            if (accessData.canoverridegrades) {
                                _this.evaluateForm.controls['grade'].setValue(_this.evaluate.grade);
                                _this.evaluateForm.controls['text'].setValue(_this.evaluate.text);
                            }
                        });
                    }
                    else if (_this.workshop.phase == __WEBPACK_IMPORTED_MODULE_12__providers_workshop__["a" /* AddonModWorkshopProvider */].PHASE_CLOSED && _this.assessment.gradinggradeoverby) {
                        return _this.userProvider.getProfile(_this.assessment.gradinggradeoverby, _this.courseId, true)
                            .then(function (profile) {
                            _this.evaluateByProfile = profile;
                        });
                    }
                });
            }
        }).catch(function (message) {
            _this.domUtils.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
        }).finally(function () {
            _this.loaded = true;
        });
    };
    /**
     * Force leaving the page, without checking for changes.
     */
    AddonModWorkshopAssessmentPage.prototype.forceLeavePage = function () {
        this.forceLeave = true;
        this.navCtrl.pop();
    };
    /**
     * Check if data has changed.
     *
     * @return {boolean} True if changed, false otherwise.
     */
    AddonModWorkshopAssessmentPage.prototype.hasEvaluationChanged = function () {
        if (!this.loaded || !this.evaluating) {
            return false;
        }
        var inputData = this.evaluateForm.value;
        if (this.originalEvaluation.weight != inputData.weight) {
            return true;
        }
        if (this.access && this.access.canoverridegrades) {
            if (this.originalEvaluation.text != inputData.text) {
                return true;
            }
            if (this.originalEvaluation.grade != inputData.grade) {
                return true;
            }
        }
        return false;
    };
    /**
     * Convenience function to refresh all the data.
     *
     * @return {Promise<any>} Resolved when done.
     */
    AddonModWorkshopAssessmentPage.prototype.refreshAllData = function () {
        var _this = this;
        var promises = [];
        promises.push(this.workshopProvider.invalidateWorkshopData(this.courseId));
        promises.push(this.workshopProvider.invalidateWorkshopAccessInformationData(this.workshopId));
        promises.push(this.workshopProvider.invalidateReviewerAssesmentsData(this.workshopId));
        if (this.assessmentId) {
            promises.push(this.workshopProvider.invalidateAssessmentFormData(this.workshopId, this.assessmentId));
            promises.push(this.workshopProvider.invalidateAssessmentData(this.workshopId, this.assessmentId));
        }
        return Promise.all(promises).finally(function () {
            _this.eventsProvider.trigger(__WEBPACK_IMPORTED_MODULE_12__providers_workshop__["a" /* AddonModWorkshopProvider */].ASSESSMENT_INVALIDATED, _this.siteId);
            return _this.fetchAssessmentData();
        });
    };
    /**
     * Pull to refresh.
     *
     * @param {any} refresher Refresher.
     */
    AddonModWorkshopAssessmentPage.prototype.refreshAssessment = function (refresher) {
        if (this.loaded) {
            this.refreshAllData().finally(function () {
                refresher.complete();
            });
        }
    };
    /**
     * Save the assessment evaluation.
     */
    AddonModWorkshopAssessmentPage.prototype.saveEvaluation = function () {
        var _this = this;
        // Check if data has changed.
        if (this.hasEvaluationChanged()) {
            this.sendEvaluation().then(function () {
                _this.forceLeavePage();
            });
        }
        else {
            // Nothing to save, just go back.
            this.forceLeavePage();
        }
    };
    /**
     * Sends the evaluation to be saved on the server.
     *
     * @return {Promise<any>} Resolved when done.
     */
    AddonModWorkshopAssessmentPage.prototype.sendEvaluation = function () {
        var _this = this;
        var modal = this.domUtils.showModalLoading('core.sending', true), inputData = this.evaluateForm.value;
        inputData.grade = inputData.grade >= 0 ? inputData.grade : '';
        // Add some HTML to the message if needed.
        inputData.text = this.textUtils.formatHtmlLines(inputData.text);
        // Try to send it to server.
        return this.workshopProvider.evaluateAssessment(this.workshopId, this.assessmentId, this.courseId, inputData.text, inputData.weight, inputData.grade).then(function () {
            var data = {
                workshopId: _this.workshopId,
                assessmentId: _this.assessmentId,
                userId: _this.currentUserId
            };
            return _this.workshopProvider.invalidateAssessmentData(_this.workshopId, _this.assessmentId).finally(function () {
                _this.eventsProvider.trigger(__WEBPACK_IMPORTED_MODULE_12__providers_workshop__["a" /* AddonModWorkshopProvider */].ASSESSMENT_SAVED, data, _this.siteId);
            });
        }).catch(function (message) {
            _this.domUtils.showErrorModalDefault(message, 'Cannot save assessment evaluation');
        }).finally(function () {
            modal.dismiss();
        });
    };
    /**
     * Component being destroyed.
     */
    AddonModWorkshopAssessmentPage.prototype.ngOnDestroy = function () {
        this.isDestroyed = true;
        this.syncObserver && this.syncObserver.off();
        // Restore original back functions.
        this.syncProvider.unblockOperation(__WEBPACK_IMPORTED_MODULE_12__providers_workshop__["a" /* AddonModWorkshopProvider */].COMPONENT, this.workshopId);
    };
    AddonModWorkshopAssessmentPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-addon-mod-workshop-assessment-page',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/addon/mod/workshop/pages/assessment/assessment.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title><core-format-text [text]="title"></core-format-text></ion-title>\n        <ion-buttons end [hidden]="!evaluating">\n            <button ion-button clear (click)="saveEvaluation()" [attr.aria-label]="\'core.save\' | translate">\n                {{ \'core.save\' | translate }}\n            </button>\n        </ion-buttons>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ion-refresher [enabled]="loaded" (ionRefresh)="refreshAssessment($event)">\n        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n    </ion-refresher>\n    <core-loading [hideUntil]="loaded">\n\n        <ion-item text-wrap>\n            <ion-avatar item-start *ngIf="profile">\n                <img [src]="profile.profileimageurl" core-external-content core-user-link [courseId]="courseId" [userId]="profile.id" [alt]="\'core.pictureof\' | translate:{$a: profile.fullname}" role="presentation" onError="this.src=\'assets/img/user-avatar.png\'">\n            </ion-avatar>\n            <h2 *ngIf="profile && profile.fullname">{{profile.fullname}}</h2>\n\n            <p *ngIf="workshop && assessment && showGrade(assessment.grade)">\n                {{ \'addon.mod_workshop.submissiongradeof\' | translate:{$a: workshop.grade } }}: {{assessment.grade}}\n            </p>\n            <p *ngIf="access && access.canviewallsubmissions && assessment && showGrade(assessment.gradinggrade)" [class.core-has-overriden-grade]=" showGrade(assessment.gradinggrade)">\n                {{ \'addon.mod_workshop.gradinggradeof\' | translate:{$a: workshop.gradinggrade } }}: {{assessment.gradinggrade}}\n            </p>\n            <p *ngIf="access && access.canviewallsubmissions && assessment && showGrade(assessment.gradinggradeover)" class="core-overriden-grade">\n                {{ \'addon.mod_workshop.gradinggradeover\' | translate }}: {{assessment.gradinggradeover}}\n            </p>\n            <p *ngIf="assessment && assessment.weight && assessment.weight != 1">\n                {{ \'addon.mod_workshop.weightinfo\' | translate:{$a: assessment.weight } }}\n            </p>\n            <ion-badge *ngIf="!assessment || !showGrade(assessment.grade)" color="danger">\n                {{ \'addon.mod_workshop.notassessed\' | translate }}\n            </ion-badge>\n        </ion-item>\n\n        <addon-mod-workshop-assessment-strategy *ngIf="assessment && assessmentId && showGrade(assessment.grade) && workshop && access && profile" [workshop]="workshop" [access]="access" [assessmentId]="assessmentId" [userId]="profile.id" [strategy]="strategy"></addon-mod-workshop-assessment-strategy>\n\n        <form ion-list [formGroup]="evaluateForm" *ngIf="evaluating">\n            <ion-item text-wrap>\n                <h2>{{ \'addon.mod_workshop.assessmentsettings\' | translate }}</h2>\n            </ion-item>\n            <ion-item text-wrap *ngIf="access.canallocate">\n                <ion-label stacked core-mark-required="true">{{ \'addon.mod_workshop.assessmentweight\' | translate }}</ion-label>\n                <ion-select formControlName="weight" required="true" interface="popover">\n                    <ion-option *ngFor="let w of weights" [value]="w">{{ w }}</ion-option>\n                </ion-select>\n            </ion-item>\n            <ion-item text-wrap>\n                <h2>{{ \'addon.mod_workshop.gradinggradecalculated\' | translate }}</h2>\n                <p>{{ assessment.gradinggrade }}</p>\n            </ion-item>\n            <ion-item text-wrap *ngIf="access.canoverridegrades">\n                <ion-label stacked>{{ \'addon.mod_workshop.gradinggradeover\' | translate }}</ion-label>\n                <ion-select formControlName="grade" interface="popover">\n                    <ion-option *ngFor="let grade of evaluationGrades" [value]="grade.value">{{grade.label}}</ion-option>\n                </ion-select>\n            </ion-item>\n            <ion-item *ngIf="access.canoverridegrades">\n                <ion-label stacked>{{ \'addon.mod_workshop.feedbackreviewer\' | translate }}</ion-label>\n                <core-rich-text-editor item-content [control]="evaluateForm.controls[\'text\']" formControlName="text"></core-rich-text-editor>\n            </ion-item>\n        </form>\n        <ion-list *ngIf="!evaluating && evaluate && evaluate.text">\n            <ion-item text-wrap>\n                <ion-avatar item-start *ngIf="evaluateGradingByProfile">\n                    <img [src]="evaluateGradingByProfile.profileimageurl" core-external-content core-user-link [courseId]="courseId" [userId]="evaluateGradingByProfile.id" [alt]="\'core.pictureof\' | translate:{$a: evaluateGradingByProfile.fullname}" role="presentation" onError="this.src=\'assets/img/user-avatar.png\'">\n                </ion-avatar>\n                <h2 *ngIf="evaluateGradingByProfile && evaluateGradingByProfile.fullname">{{ \'addon.mod_workshop.feedbackby\' | translate : {$a: evaluateGradingByProfile.fullname} }}</h2>\n                <core-format-text [text]="evaluate.text"></core-format-text>\n            </ion-item>\n        </ion-list>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/addon/mod/workshop/pages/assessment/assessment.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_5__providers_sites__["a" /* CoreSitesProvider */], __WEBPACK_IMPORTED_MODULE_9__core_course_providers_course__["a" /* CoreCourseProvider */],
            __WEBPACK_IMPORTED_MODULE_12__providers_workshop__["a" /* AddonModWorkshopProvider */], __WEBPACK_IMPORTED_MODULE_14__providers_offline__["a" /* AddonModWorkshopOfflineProvider */],
            __WEBPACK_IMPORTED_MODULE_13__providers_helper__["a" /* AddonModWorkshopHelperProvider */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */],
            __WEBPACK_IMPORTED_MODULE_6__providers_sync__["a" /* CoreSyncProvider */], __WEBPACK_IMPORTED_MODULE_8__providers_utils_text__["a" /* CoreTextUtilsProvider */], __WEBPACK_IMPORTED_MODULE_2__angular_forms__["a" /* FormBuilder */],
            __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__["c" /* TranslateService */], __WEBPACK_IMPORTED_MODULE_4__providers_events__["a" /* CoreEventsProvider */],
            __WEBPACK_IMPORTED_MODULE_7__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_11__core_grades_providers_helper__["a" /* CoreGradesHelperProvider */],
            __WEBPACK_IMPORTED_MODULE_10__core_user_providers_user__["a" /* CoreUserProvider */]])
    ], AddonModWorkshopAssessmentPage);
    return AddonModWorkshopAssessmentPage;
}());

//# sourceMappingURL=assessment.js.map

/***/ })

});
//# sourceMappingURL=56.js.map