webpackJsonp([86],{

/***/ 1813:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddonModFeedbackFormPageModule", function() { return AddonModFeedbackFormPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__components_components_module__ = __webpack_require__(924);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__form__ = __webpack_require__(1934);
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







var AddonModFeedbackFormPageModule = /** @class */ (function () {
    function AddonModFeedbackFormPageModule() {
    }
    AddonModFeedbackFormPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_6__form__["a" /* AddonModFeedbackFormPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_3__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__components_components_module__["a" /* AddonModFeedbackComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_6__form__["a" /* AddonModFeedbackFormPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], AddonModFeedbackFormPageModule);
    return AddonModFeedbackFormPageModule;
}());

//# sourceMappingURL=form.module.js.map

/***/ }),

/***/ 1934:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AddonModFeedbackFormPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ionic_native_network__ = __webpack_require__(133);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_feedback__ = __webpack_require__(85);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_helper__ = __webpack_require__(246);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_sync__ = __webpack_require__(256);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__providers_utils_utils__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__providers_app__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__providers_events__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__core_course_providers_course__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12__core_login_providers_helper__ = __webpack_require__(79);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13__core_contentlinks_providers_helper__ = __webpack_require__(32);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_14__providers_sites__ = __webpack_require__(2);
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
 * Page that displays feedback form.
 */
var AddonModFeedbackFormPage = /** @class */ (function () {
    function AddonModFeedbackFormPage(navParams, feedbackProvider, appProvider, utils, domUtils, navCtrl, feedbackHelper, courseProvider, eventsProvider, feedbackSync, network, translate, loginHelper, linkHelper, sitesProvider, content, zone) {
        var _this = this;
        this.feedbackProvider = feedbackProvider;
        this.appProvider = appProvider;
        this.utils = utils;
        this.domUtils = domUtils;
        this.navCtrl = navCtrl;
        this.feedbackHelper = feedbackHelper;
        this.courseProvider = courseProvider;
        this.eventsProvider = eventsProvider;
        this.feedbackSync = feedbackSync;
        this.translate = translate;
        this.loginHelper = loginHelper;
        this.linkHelper = linkHelper;
        this.content = content;
        this.forceLeave = false;
        this.preview = false;
        this.component = __WEBPACK_IMPORTED_MODULE_4__providers_feedback__["a" /* AddonModFeedbackProvider */].COMPONENT;
        this.offline = false;
        this.feedbackLoaded = false;
        this.items = [];
        this.hasPrevPage = false;
        this.hasNextPage = false;
        this.completed = false;
        this.completedOffline = false;
        this.module = navParams.get('module');
        this.courseId = navParams.get('courseId');
        this.currentPage = navParams.get('page');
        this.title = navParams.get('title');
        this.preview = !!navParams.get('preview');
        this.componentId = navParams.get('moduleId') || this.module.id;
        this.currentSite = sitesProvider.getCurrentSite();
        // Refresh online status when changes.
        this.onlineObserver = network.onchange().subscribe(function (online) {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(function () {
                _this.offline = !online;
            });
        });
    }
    /**
     * View loaded.
     */
    AddonModFeedbackFormPage.prototype.ionViewDidLoad = function () {
        var _this = this;
        this.fetchData().then(function () {
            _this.feedbackProvider.logView(_this.feedback.id, true).then(function () {
                _this.courseProvider.checkModuleCompletion(_this.courseId, _this.module.completionstatus);
            });
        });
    };
    /**
     * View entered.
     */
    AddonModFeedbackFormPage.prototype.ionViewDidEnter = function () {
        this.forceLeave = false;
    };
    /**
     * Check if we can leave the page or not.
     *
     * @return {boolean | Promise<void>} Resolved if we can leave it, rejected if not.
     */
    AddonModFeedbackFormPage.prototype.ionViewCanLeave = function () {
        if (this.forceLeave) {
            return true;
        }
        if (!this.preview) {
            var responses = this.feedbackHelper.getPageItemsResponses(this.items);
            if (this.items && !this.completed && this.originalData) {
                // Form submitted. Check if there is any change.
                if (!this.utils.basicLeftCompare(responses, this.originalData, 3)) {
                    return this.domUtils.showConfirm(this.translate.instant('core.confirmcanceledit'));
                }
            }
        }
        return Promise.resolve();
    };
    /**
     * Fetch all the data required for the view.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonModFeedbackFormPage.prototype.fetchData = function () {
        var _this = this;
        this.offline = !this.appProvider.isOnline();
        return this.feedbackProvider.getFeedback(this.courseId, this.module.id).then(function (feedbackData) {
            _this.feedback = feedbackData;
            _this.title = _this.feedback.name || _this.title;
            return _this.fetchAccessData();
        }).then(function (accessData) {
            if (!_this.preview && accessData.cansubmit && !accessData.isempty) {
                return typeof _this.currentPage == 'undefined' ?
                    _this.feedbackProvider.getResumePage(_this.feedback.id, _this.offline, true) :
                    Promise.resolve(_this.currentPage);
            }
            else {
                _this.preview = true;
                return Promise.resolve(0);
            }
        }).catch(function (error) {
            if (!_this.offline && !_this.utils.isWebServiceError(error)) {
                // If it fails, go offline.
                _this.offline = true;
                return _this.feedbackProvider.getResumePage(_this.feedback.id, true);
            }
            return Promise.reject(error);
        }).then(function (page) {
            return _this.fetchFeedbackPageData(page || 0);
        }).catch(function (message) {
            _this.domUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);
            _this.forceLeave = true;
            _this.navCtrl.pop();
            return Promise.reject(null);
        }).finally(function () {
            _this.feedbackLoaded = true;
        });
    };
    /**
     * Fetch access information.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonModFeedbackFormPage.prototype.fetchAccessData = function () {
        var _this = this;
        return this.feedbackProvider.getFeedbackAccessInformation(this.feedback.id, this.offline, true).catch(function (error) {
            if (!_this.offline && !_this.utils.isWebServiceError(error)) {
                // If it fails, go offline.
                _this.offline = true;
                return _this.feedbackProvider.getFeedbackAccessInformation(_this.feedback.id, true);
            }
            return Promise.reject(error);
        }).then(function (accessData) {
            _this.access = accessData;
            return accessData;
        });
    };
    AddonModFeedbackFormPage.prototype.fetchFeedbackPageData = function (page) {
        var _this = this;
        if (page === void 0) { page = 0; }
        var promise;
        this.items = [];
        if (this.preview) {
            promise = this.feedbackProvider.getItems(this.feedback.id);
        }
        else {
            this.currentPage = page;
            promise = this.feedbackProvider.getPageItemsWithValues(this.feedback.id, page, this.offline, true).catch(function (error) {
                if (!_this.offline && !_this.utils.isWebServiceError(error)) {
                    // If it fails, go offline.
                    _this.offline = true;
                    return _this.feedbackProvider.getPageItemsWithValues(_this.feedback.id, page, true);
                }
                return Promise.reject(error);
            }).then(function (response) {
                _this.hasPrevPage = !!response.hasprevpage;
                _this.hasNextPage = !!response.hasnextpage;
                return response;
            });
        }
        return promise.then(function (response) {
            _this.items = response.items.map(function (itemData) {
                return _this.feedbackHelper.getItemForm(itemData, _this.preview);
            }).filter(function (itemData) {
                // Filter items with errors.
                return itemData;
            });
            if (!_this.preview) {
                var itemsCopy = _this.utils.clone(_this.items); // Copy the array to avoid modifications.
                _this.originalData = _this.feedbackHelper.getPageItemsResponses(itemsCopy);
            }
        });
    };
    /**
     * Function to allow page navigation through the questions form.
     *
     * @param  {boolean}       goPrevious If true it will go back to the previous page, if false, it will go forward.
     * @return {Promise<void>}            Resolved when done.
     */
    AddonModFeedbackFormPage.prototype.gotoPage = function (goPrevious) {
        var _this = this;
        this.domUtils.scrollToTop(this.content);
        this.feedbackLoaded = false;
        var responses = this.feedbackHelper.getPageItemsResponses(this.items), formHasErrors = this.items.some(function (item) {
            return item.isEmpty || item.hasError;
        });
        // Sync other pages first.
        return this.feedbackSync.syncFeedback(this.feedback.id).catch(function () {
            // Ignore errors.
        }).then(function () {
            return _this.feedbackProvider.processPage(_this.feedback.id, _this.currentPage, responses, goPrevious, formHasErrors, _this.courseId).then(function (response) {
                var jumpTo = parseInt(response.jumpto, 10);
                if (response.completed) {
                    // Form is completed, show completion message and buttons.
                    _this.items = [];
                    _this.completed = true;
                    _this.completedOffline = !!response.offline;
                    _this.completionPageContents = response.completionpagecontents;
                    _this.siteAfterSubmit = response.siteaftersubmit;
                    _this.submitted = true;
                    // Invalidate access information so user will see home page updated (continue form or completion messages).
                    var promises = [];
                    promises.push(_this.feedbackProvider.invalidateFeedbackAccessInformationData(_this.feedback.id));
                    promises.push(_this.feedbackProvider.invalidateResumePageData(_this.feedback.id));
                    return Promise.all(promises).then(function () {
                        return _this.fetchAccessData();
                    });
                }
                else if (isNaN(jumpTo) || jumpTo == _this.currentPage) {
                    // Errors on questions, stay in page.
                    return Promise.resolve();
                }
                else {
                    _this.submitted = true;
                    // Invalidate access information so user will see home page updated (continue form).
                    _this.feedbackProvider.invalidateResumePageData(_this.feedback.id);
                    // Fetch the new page.
                    return _this.fetchFeedbackPageData(jumpTo);
                }
            });
        }).catch(function (message) {
            _this.domUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);
            return Promise.reject(null);
        }).finally(function () {
            _this.feedbackLoaded = true;
        });
    };
    /**
     * Function to link implemented features.
     */
    AddonModFeedbackFormPage.prototype.showAnalysis = function () {
        this.submitted = 'analysis';
        this.feedbackHelper.openFeature('analysis', this.navCtrl, this.module, this.courseId);
    };
    /**
     * Function to go to the page after submit.
     */
    AddonModFeedbackFormPage.prototype.continue = function () {
        var _this = this;
        if (this.siteAfterSubmit) {
            var modal_1 = this.domUtils.showModalLoading();
            this.linkHelper.handleLink(this.siteAfterSubmit).then(function (treated) {
                if (!treated) {
                    return _this.currentSite.openInBrowserWithAutoLoginIfSameSite(_this.siteAfterSubmit);
                }
            }).finally(function () {
                modal_1.dismiss();
            });
        }
        else {
            // Use redirect to make the course the new history root (to avoid "loops" in history).
            this.loginHelper.redirect('CoreCourseSectionPage', {
                course: { id: this.courseId }
            }, this.currentSite.getId());
        }
    };
    /**
     * Component being destroyed.
     */
    AddonModFeedbackFormPage.prototype.ngOnDestroy = function () {
        if (this.submitted) {
            var tab = this.submitted == 'analysis' ? 'analysis' : 'overview';
            // If form has been submitted, the info has been already invalidated but we should update index view.
            this.eventsProvider.trigger(__WEBPACK_IMPORTED_MODULE_4__providers_feedback__["a" /* AddonModFeedbackProvider */].FORM_SUBMITTED, { feedbackId: this.feedback.id, tab: tab });
        }
        this.onlineObserver && this.onlineObserver.unsubscribe();
    };
    AddonModFeedbackFormPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-addon-mod-feedback-form',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/addon/mod/feedback/pages/form/form.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title><core-format-text  [text]=" title "></core-format-text></ion-title>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <core-loading [hideUntil]="feedbackLoaded">\n        <ng-container *ngIf="items && items.length">\n            <ion-list no-margin>\n                <ion-item text-wrap>\n                    <h2>{{ \'addon.mod_feedback.mode\' | translate }}</h2>\n                    <p *ngIf="access.isanonymous">{{ \'addon.mod_feedback.anonymous\' | translate }}</p>\n                    <p *ngIf="!access.isanonymous">{{ \'addon.mod_feedback.non_anonymous\' | translate }}</p>\n                </ion-item>\n                <ng-container *ngFor="let item of items">\n                    <ion-item-divider *ngIf="item.typ == \'pagebreak\'" color="light"></ion-item-divider>\n                    <ion-item text-wrap *ngIf="item.typ != \'pagebreak\'" [color]="item.dependitem > 0 ? \'light\' : \'\'" [class.core-danger-item]="item.isEmpty || item.hasError">\n                        <ion-label *ngIf="item.name" [core-mark-required]="item.required" stacked>\n                            <span *ngIf="feedback.autonumbering && item.itemnumber">{{item.itemnumber}}. </span>\n                            <core-format-text  [component]="component" [componentId]="componentId" [text]="item.name"></core-format-text>\n                        </ion-label>\n                        <div item-content class="addon-mod_feedback-form-content" *ngIf="item.template">\n                            <ng-container [ngSwitch]="item.template">\n                                <ng-container *ngSwitchCase="\'label\'">\n                                    <p><core-format-text [component]="component" [componentId]="componentId" [text]="item.presentation"></core-format-text></p>\n                                </ng-container>\n                                <ng-container *ngSwitchCase="\'textfield\'">\n                                    <ion-input type="text" [(ngModel)]="item.value" autocorrect="off" name="{{item.typ}}_{{item.id}}" maxlength="{{item.maxlength}}" [required]="item.required"></ion-input>\n                                </ng-container>\n                                <ng-container *ngSwitchCase="\'numeric\'">\n                                    <ion-input [required]="item.required" name="{{item.typ}}_{{item.id}}" type="number" [(ngModel)]="item.value"></ion-input>\n                                    <p *ngIf="item.hasError" color="error">{{ \'addon.mod_feedback.numberoutofrange\' | translate }} [{{item.rangefrom}}<span *ngIf="item.rangefrom && item.rangeto">, </span>{{item.rangeto}}]</p>\n                                </ng-container>\n                                <ng-container *ngSwitchCase="\'textarea\'">\n                                    <ion-textarea [required]="item.required" name="{{item.typ}}_{{item.id}}" [attr.aria-multiline]="true" [(ngModel)]="item.value"></ion-textarea>\n                                </ng-container>\n                                <ng-container *ngSwitchCase="\'multichoice-r\'">\n                                    <ion-list radio-group [(ngModel)]="item.value" [required]="item.required" name="{{item.typ}}_{{item.id}}">\n                                        <ion-item *ngFor="let option of item.choices">\n                                            <ion-label><core-format-text  [component]="component" [componentId]="componentId" [text]="option.label"></core-format-text></ion-label>\n                                            <ion-radio [value]="option.value"></ion-radio>\n                                        </ion-item>\n                                    </ion-list>\n                                </ng-container>\n                                <ion-list *ngSwitchCase="\'multichoice-c\'">\n                                    <ion-item *ngFor="let option of item.choices">\n                                        <ion-label><core-format-text  [component]="component" [componentId]="componentId" [text]="option.label"></core-format-text></ion-label>\n                                        <ion-checkbox [required]="item.required" name="{{item.typ}}_{{item.id}}" [(ngModel)]="option.checked" value="option.value"></ion-checkbox>\n                                    </ion-item>\n                                </ion-list>\n                                <ng-container *ngSwitchCase="\'multichoice-d\'">\n                                    <ion-select [required]="item.required" name="{{item.typ}}_{{item.id}}" [(ngModel)]="item.value" interface="popover">\n                                        <ion-option *ngFor="let option of item.choices" [value]="option.value"><core-format-text  [component]="component" [componentId]="componentId" [text]="option.label"></core-format-text></ion-option>\n                                    </ion-select>\n                                </ng-container>\n                                <ng-container *ngSwitchCase="\'captcha\'">\n                                    <core-recaptcha *ngIf="!preview && !offline" [publicKey]="item.captcha.recaptchapublickey" [model]="item" modelValueName="value"></core-recaptcha>\n                                    <div *ngIf="!preview && (!item.captcha || offline)" class="core-warning-card" icon-start>\n                                        <ion-icon name="warning"></ion-icon>\n                                        {{ \'addon.mod_feedback.captchaofflinewarning\' | translate }}\n                                    </div>\n                                </ng-container>\n                            </ng-container>\n                        </div>\n                    </ion-item>\n                </ng-container>\n                <ion-grid *ngIf="!preview">\n                    <ion-row align-items-center>\n                        <ion-col *ngIf="hasPrevPage">\n                            <button ion-button block outline icon-start (click)="gotoPage(true)">\n                                <ion-icon name="arrow-back"></ion-icon>\n                                {{ \'addon.mod_feedback.previous_page\' | translate }}\n                            </button>\n                        </ion-col>\n                        <ion-col *ngIf="hasNextPage">\n                            <button ion-button block icon-end (click)="gotoPage(false)">\n                                {{ \'addon.mod_feedback.next_page\' | translate }}\n                                <ion-icon name="arrow-forward"></ion-icon>\n                            </button>\n                        </ion-col>\n                        <ion-col *ngIf="!hasNextPage">\n                            <button ion-button block (click)="gotoPage(false)">\n                                {{ \'addon.mod_feedback.save_entries\' | translate }}\n                            </button>\n                        </ion-col>\n                    </ion-row>\n                </ion-grid>\n            </ion-list>\n        </ng-container>\n\n        <div class="core-success-card" icon-start *ngIf="completed">\n            <ion-icon name="checkmark"></ion-icon>\n            <p *ngIf="!completionPageContents && !completedOffline">{{ \'addon.mod_feedback.this_feedback_is_already_submitted\' | translate }}</p>\n            <p *ngIf="!completionPageContents && completedOffline">{{ \'addon.mod_feedback.feedback_submitted_offline\' | translate }}</p>\n            <p *ngIf="completionPageContents"><core-format-text  [component]="component" componentId="componentId" [text]="completionPageContents"></core-format-text></p>\n        </div>\n\n        <ion-grid *ngIf="completed">\n            <ion-row align-items-center>\n                <ion-col *ngIf="access.canviewanalysis">\n                    <button ion-button block outline icon-start (click)="showAnalysis()">\n                        <ion-icon name="stats"></ion-icon>\n                        {{ \'addon.mod_feedback.completed_feedbacks\' | translate }}\n                    </button>\n                </ion-col>\n                <ion-col *ngIf="hasNextPage">\n                    <button ion-button block icon-end (click)="continue()">\n                        {{ \'core.continue\' | translate }}\n                        <ion-icon name="arrow-forward"></ion-icon>\n                    </button>\n                </ion-col>\n            </ion-row>\n        </ion-grid>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/addon/mod/feedback/pages/form/form.html"*/,
        }),
        __param(15, Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["N" /* Optional */])()),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_4__providers_feedback__["a" /* AddonModFeedbackProvider */], __WEBPACK_IMPORTED_MODULE_9__providers_app__["a" /* CoreAppProvider */],
            __WEBPACK_IMPORTED_MODULE_8__providers_utils_utils__["a" /* CoreUtilsProvider */], __WEBPACK_IMPORTED_MODULE_7__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */],
            __WEBPACK_IMPORTED_MODULE_5__providers_helper__["a" /* AddonModFeedbackHelperProvider */], __WEBPACK_IMPORTED_MODULE_11__core_course_providers_course__["a" /* CoreCourseProvider */],
            __WEBPACK_IMPORTED_MODULE_10__providers_events__["a" /* CoreEventsProvider */], __WEBPACK_IMPORTED_MODULE_6__providers_sync__["a" /* AddonModFeedbackSyncProvider */], __WEBPACK_IMPORTED_MODULE_2__ionic_native_network__["a" /* Network */],
            __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__["c" /* TranslateService */], __WEBPACK_IMPORTED_MODULE_12__core_login_providers_helper__["a" /* CoreLoginHelperProvider */],
            __WEBPACK_IMPORTED_MODULE_13__core_contentlinks_providers_helper__["a" /* CoreContentLinksHelperProvider */], __WEBPACK_IMPORTED_MODULE_14__providers_sites__["a" /* CoreSitesProvider */],
            __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */], __WEBPACK_IMPORTED_MODULE_0__angular_core__["M" /* NgZone */]])
    ], AddonModFeedbackFormPage);
    return AddonModFeedbackFormPage;
}());

//# sourceMappingURL=form.js.map

/***/ })

});
//# sourceMappingURL=86.js.map