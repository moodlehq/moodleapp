webpackJsonp([70],{

/***/ 1829:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddonModLessonUserRetakePageModule", function() { return AddonModLessonUserRetakePageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__pipes_pipes_module__ = __webpack_require__(67);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__user_retake__ = __webpack_require__(1950);
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







var AddonModLessonUserRetakePageModule = /** @class */ (function () {
    function AddonModLessonUserRetakePageModule() {
    }
    AddonModLessonUserRetakePageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_6__user_retake__["a" /* AddonModLessonUserRetakePage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_3__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_5__pipes_pipes_module__["a" /* CorePipesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_6__user_retake__["a" /* AddonModLessonUserRetakePage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], AddonModLessonUserRetakePageModule);
    return AddonModLessonUserRetakePageModule;
}());

//# sourceMappingURL=user-retake.module.js.map

/***/ }),

/***/ 1950:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AddonModLessonUserRetakePage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_utils_text__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_utils_time__ = __webpack_require__(22);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__core_user_providers_user__ = __webpack_require__(26);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__providers_lesson__ = __webpack_require__(97);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__providers_helper__ = __webpack_require__(935);
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
 * Page that displays a retake made by a certain user.
 */
var AddonModLessonUserRetakePage = /** @class */ (function () {
    function AddonModLessonUserRetakePage(navParams, sitesProvider, textUtils, translate, domUtils, userProvider, timeUtils, lessonProvider, lessonHelper) {
        this.textUtils = textUtils;
        this.translate = translate;
        this.domUtils = domUtils;
        this.userProvider = userProvider;
        this.timeUtils = timeUtils;
        this.lessonProvider = lessonProvider;
        this.lessonHelper = lessonHelper;
        this.component = __WEBPACK_IMPORTED_MODULE_8__providers_lesson__["a" /* AddonModLessonProvider */].COMPONENT;
        this.lessonId = navParams.get('lessonId');
        this.courseId = navParams.get('courseId');
        this.userId = navParams.get('userId') || sitesProvider.getCurrentSiteUserId();
        this.retakeNumber = navParams.get('retake');
    }
    /**
     * Component being initialized.
     */
    AddonModLessonUserRetakePage.prototype.ngOnInit = function () {
        var _this = this;
        // Fetch the data.
        this.fetchData().finally(function () {
            _this.loaded = true;
        });
    };
    /**
     * Change the retake displayed.
     *
     * @param {number} retakeNumber The new retake number.
     */
    AddonModLessonUserRetakePage.prototype.changeRetake = function (retakeNumber) {
        var _this = this;
        this.loaded = false;
        this.setRetake(retakeNumber).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error, 'Error getting attempt.');
        }).finally(function () {
            _this.loaded = true;
        });
    };
    /**
     * Pull to refresh.
     *
     * @param {any} refresher Refresher.
     */
    AddonModLessonUserRetakePage.prototype.doRefresh = function (refresher) {
        this.refreshData().finally(function () {
            refresher.complete();
        });
    };
    /**
     * Get lesson and retake data.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonModLessonUserRetakePage.prototype.fetchData = function () {
        var _this = this;
        return this.lessonProvider.getLessonById(this.courseId, this.lessonId).then(function (lessonData) {
            _this.lesson = lessonData;
            // Get the retakes overview for all participants.
            return _this.lessonProvider.getRetakesOverview(_this.lesson.id);
        }).then(function (data) {
            // Search the student.
            var student;
            if (data && data.students) {
                for (var i = 0; i < data.students.length; i++) {
                    if (data.students[i].id == _this.userId) {
                        student = data.students[i];
                        break;
                    }
                }
            }
            if (!student) {
                // Student not found.
                return Promise.reject(_this.translate.instant('addon.mod_lesson.cannotfinduser'));
            }
            if (!student.attempts || !student.attempts.length) {
                // No retakes.
                return Promise.reject(_this.translate.instant('addon.mod_lesson.cannotfindattempt'));
            }
            student.bestgrade = _this.textUtils.roundToDecimals(student.bestgrade, 2);
            student.attempts.forEach(function (retake) {
                if (_this.retakeNumber == retake.try) {
                    // The retake specified as parameter exists. Use it.
                    _this.selectedRetake = _this.retakeNumber;
                }
                retake.label = _this.lessonHelper.getRetakeLabel(retake);
            });
            if (!_this.selectedRetake) {
                // Retake number not specified or not valid, use the last retake.
                _this.selectedRetake = student.attempts[student.attempts.length - 1].try;
            }
            // Get the profile image of the user.
            return _this.userProvider.getProfile(student.id, _this.courseId, true).then(function (user) {
                student.profileimageurl = user.profileimageurl;
                return student;
            }).catch(function () {
                // Error getting profile, resolve promise without adding any extra data.
                return student;
            });
        }).then(function (student) {
            _this.student = student;
            return _this.setRetake(_this.selectedRetake);
        }).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error, 'Error getting data.', true);
        });
    };
    /**
     * Refreshes data.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonModLessonUserRetakePage.prototype.refreshData = function () {
        var _this = this;
        var promises = [];
        promises.push(this.lessonProvider.invalidateLessonData(this.courseId));
        if (this.lesson) {
            promises.push(this.lessonProvider.invalidateRetakesOverview(this.lesson.id));
            promises.push(this.lessonProvider.invalidateUserRetakesForUser(this.lesson.id, this.userId));
        }
        return Promise.all(promises).catch(function () {
            // Ignore errors.
        }).then(function () {
            return _this.fetchData();
        });
    };
    /**
     * Set the retake to view and load its data.
     *
     * @param {number}retakeNumber Retake number to set.
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonModLessonUserRetakePage.prototype.setRetake = function (retakeNumber) {
        var _this = this;
        this.selectedRetake = retakeNumber;
        return this.lessonProvider.getUserRetake(this.lessonId, retakeNumber, this.userId).then(function (data) {
            if (data && data.completed != -1) {
                // Completed.
                data.userstats.grade = _this.textUtils.roundToDecimals(data.userstats.grade, 2);
                data.userstats.timetakenReadable = _this.timeUtils.formatTime(data.userstats.timetotake);
            }
            if (data && data.answerpages) {
                // Format pages data.
                data.answerpages.forEach(function (page) {
                    if (_this.lessonProvider.answerPageIsContent(page)) {
                        page.isContent = true;
                        if (page.answerdata && page.answerdata.answers) {
                            page.answerdata.answers.forEach(function (answer) {
                                // Content pages only have 1 valid field in the answer array.
                                answer[0] = _this.lessonHelper.getContentPageAnswerDataFromHtml(answer[0]);
                            });
                        }
                    }
                    else if (_this.lessonProvider.answerPageIsQuestion(page)) {
                        page.isQuestion = true;
                        if (page.answerdata && page.answerdata.answers) {
                            page.answerdata.answers.forEach(function (answer) {
                                // Only the first field of the answer array requires to be parsed.
                                answer[0] = _this.lessonHelper.getQuestionPageAnswerDataFromHtml(answer[0]);
                            });
                        }
                    }
                });
            }
            _this.retake = data;
        });
    };
    AddonModLessonUserRetakePage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-addon-mod-lesson-user-retake',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/addon/mod/lesson/pages/user-retake/user-retake.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{ \'addon.mod_lesson.detailedstats\' | translate }}</ion-title>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ion-refresher [enabled]="loaded" (ionRefresh)="doRefresh($event)">\n        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n    </ion-refresher>\n\n    <core-loading [hideUntil]="loaded">\n        <ion-list *ngIf="student">\n            <!-- Student data. -->\n            <a ion-item text-wrap core-user-link [userId]="student.id" [courseId]="courseId" [title]="student.fullname">\n                <ion-avatar *ngIf="student.profileimageurl" item-start>\n                    <img [src]="student.profileimageurl" [alt]="\'core.pictureof\' | translate:{$a: student.fullname}" core-external-content role="presentation">\n                </ion-avatar>\n                <h2>{{student.fullname}}</h2>\n                <core-progress-bar [progress]="student.bestgrade"></core-progress-bar>\n            </a>\n\n            <!-- Retake selector if there is more than one retake. -->\n            <ion-item text-wrap *ngIf="student.attempts && student.attempts.length > 1">\n                <ion-label id="addon-mod_lesson-retakeslabel">{{ \'addon.mod_lesson.attemptheader\' | translate }}</ion-label>\n                <ion-select [(ngModel)]="selectedRetake" (ionChange)="changeRetake(selectedRetake)" aria-labelledby="addon-mod_lesson-retakeslabel" interface="popover">\n                    <ion-option *ngFor="let retake of student.attempts" [value]="retake.try">{{retake.label}}</ion-option>\n                </ion-select>\n            </ion-item>\n\n            <!-- Retake stats. -->\n            <div *ngIf="retake && retake.userstats && retake.userstats.gradeinfo" class="addon-mod_lesson-userstats">\n                <ion-item text-wrap>\n                    <ion-row>\n                        <ion-col>\n                            <p class="item-heading">{{ \'addon.mod_lesson.grade\' | translate }}</p>\n                            <p>{{ \'core.percentagenumber\' | translate:{$a: retake.userstats.grade} }}</p>\n                        </ion-col>\n\n                        <ion-col>\n                            <p class="item-heading">{{ \'addon.mod_lesson.rawgrade\' | translate }}</p>\n                            <p>{{ retake.userstats.gradeinfo.earned }} / {{ retake.userstats.gradeinfo.total }}</p>\n                        </ion-col>\n                    </ion-row>\n                </ion-item>\n                <ion-item text-wrap>\n                    <p class="item-heading">{{ \'addon.mod_lesson.timetaken\' | translate }}</p>\n                    <p>{{ retake.userstats.timetakenReadable }}</p>\n                </ion-item>\n                <ion-item text-wrap>\n                    <p class="item-heading">{{ \'addon.mod_lesson.completed\' | translate }}</p>\n                    <p>{{ retake.userstats.completed * 1000 | coreFormatDate:"dfmediumdate" }}</p>\n                </ion-item>\n            </div>\n\n            <!-- Not completed, no stats. -->\n            <ion-item text-wrap *ngIf="retake && (!retake.userstats || !retake.userstats.gradeinfo)">\n                {{ \'addon.mod_lesson.notcompleted\' | translate }}\n            </ion-item>\n\n            <!-- Pages. -->\n            <ng-container *ngIf="retake">\n                <!-- The "text-dimmed" class does nothing, but the same goes for the "dimmed" class in Moodle. -->\n                <ion-card *ngFor="let page of retake.answerpages" class="addon-mod_lesson-answerpage" [ngClass]="{\'text-dimmed\': page.grayout}">\n                    <ion-card-header text-wrap>\n                        <h2>{{page.qtype}}: {{page.title}}</h2>\n                    </ion-card-header>\n                    <ion-item text-wrap>\n                        <p class="item-heading">{{ \'addon.mod_lesson.question\' | translate }}</p>\n                        <p><core-format-text [component]="component" [componentId]="lesson.coursemodule" [maxHeight]="50" [text]="page.contents"></core-format-text></p>\n                    </ion-item>\n                    <ion-item text-wrap>\n                        <p class="item-heading">{{ \'addon.mod_lesson.answer\' | translate }}</p>\n                    </ion-item>\n                    <ion-item text-wrap *ngIf="!page.answerdata || !page.answerdata.answers || !page.answerdata.answers.length">\n                        <p>{{ \'addon.mod_lesson.didnotanswerquestion\' | translate }}</p>\n                    </ion-item>\n                    <div *ngIf="page.answerdata && page.answerdata.answers && page.answerdata.answers.length" class="addon-mod_lesson-answer">\n                        <div *ngFor="let answer of page.answerdata.answers">\n                            <ion-item text-wrap *ngIf="page.isContent">\n                                <!-- Content page, display a button and the content. -->\n                                <ion-row>\n                                    <ion-col>\n                                        <button ion-button block color="light" [disabled]="true">{{ answer[0].buttonText }}</button>\n                                    </ion-col>\n                                    <ion-col>\n                                        <p [innerHTML]="answer[0].content"></p>\n                                    </ion-col>\n                                </ion-row>\n                            </ion-item>\n\n                            <div *ngIf="page.isQuestion">\n                                <!-- Question page, show the right input for the answer. -->\n\n                                <!-- Truefalse or matching. -->\n                                <ion-item text-wrap *ngIf="answer[0].isCheckbox" [ngClass]="{\'addon-mod_lesson-highlight\': answer[0].highlight}">\n                                    <ion-label>\n                                        <p><core-format-text [component]="component" [componentId]="lesson.coursemodule" [text]="answer[0].content"></core-format-text></p>\n                                        <ion-badge *ngIf="answer[1]" color="dark">\n                                            <core-format-text [component]="component" [componentId]="lesson.coursemodule" [text]="answer[1]"></core-format-text>\n                                        </ion-badge>\n                                    </ion-label>\n                                    <ion-checkbox [attr.name]="answer[0].name" [ngModel]="answer[0].checked" [disabled]="true" item-end>\n                                    </ion-checkbox>\n                                </ion-item>\n\n                                <!-- Short answer or numeric. -->\n                                <ion-item text-wrap *ngIf="answer[0].isText">\n                                    <p>{{ answer[0].value }}</p>\n                                    <ion-badge *ngIf="answer[1]" color="dark">\n                                        <core-format-text [component]="component" [componentId]="lesson.coursemodule" [text]="answer[1]"></core-format-text>\n                                    </ion-badge>\n                                </ion-item>\n\n                                <!-- Matching. -->\n                                <ion-item text-wrap *ngIf="answer[0].isSelect">\n                                    <ion-row>\n                                        <ion-col>\n                                            <p><core-format-text [component]="component" [componentId]="lesson.coursemodule" [text]=" answer[0].content"></core-format-text></p>\n                                        </ion-col>\n                                        <ion-col>\n                                            <p>{{answer[0].value}}</p>\n                                            <ion-badge *ngIf="answer[1]" color="dark">\n                                                <core-format-text [component]="component" [componentId]="lesson.coursemodule" [text]="answer[1]"></core-format-text>\n                                            </ion-badge>\n                                        </ion-col>\n                                    </ion-row>\n                                </ion-item>\n\n                                <!-- Essay or couldn\'t determine. -->\n                                <ion-item text-wrap *ngIf="!answer[0].isCheckbox && !answer[0].isText && !answer[0].isSelect">\n                                    <p><core-format-text [component]="component" [componentId]="lesson.coursemodule" [text]="answer[0]"></core-format-text></p>\n                                    <ion-badge *ngIf="answer[1]" color="dark">\n                                        <core-format-text [component]="component" [componentId]="lesson.coursemodule" [text]="answer[1]"></core-format-text>\n                                    </ion-badge>\n                                </ion-item>\n                            </div>\n\n                            <ion-item text-wrap *ngIf="!page.isContent && !page.isQuestion">\n                                <!-- Another page (end of branch, ...). -->\n                                <p><core-format-text [component]="component" [componentId]="lesson.coursemodule" [text]="answer[0]"></core-format-text></p>\n                                <ion-badge *ngIf="answer[1]" color="dark">\n                                    <core-format-text [component]="component" [componentId]="lesson.coursemodule" [text]="answer[1]"></core-format-text>\n                                </ion-badge>\n                            </ion-item>\n                        </div>\n\n                        <ion-item text-wrap *ngIf="page.answerdata.response">\n                            <p class="item-heading">{{ \'addon.mod_lesson.response\' | translate }}</p>\n                            <p><core-format-text [component]="component" [componentId]="lesson.coursemodule" [text]="page.answerdata.response"></core-format-text></p>\n                        </ion-item>\n                        <ion-item text-wrap *ngIf="page.answerdata.score">\n                            <p>{{page.answerdata.score}}</p>\n                        </ion-item>\n                    </div>\n                </ion-card>\n            </ng-container>\n        </ion-list>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/addon/mod/lesson/pages/user-retake/user-retake.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_3__providers_sites__["a" /* CoreSitesProvider */], __WEBPACK_IMPORTED_MODULE_5__providers_utils_text__["a" /* CoreTextUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["c" /* TranslateService */], __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__["a" /* CoreDomUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_7__core_user_providers_user__["a" /* CoreUserProvider */], __WEBPACK_IMPORTED_MODULE_6__providers_utils_time__["a" /* CoreTimeUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_8__providers_lesson__["a" /* AddonModLessonProvider */], __WEBPACK_IMPORTED_MODULE_9__providers_helper__["a" /* AddonModLessonHelperProvider */]])
    ], AddonModLessonUserRetakePage);
    return AddonModLessonUserRetakePage;
}());

//# sourceMappingURL=user-retake.js.map

/***/ })

});
//# sourceMappingURL=70.js.map