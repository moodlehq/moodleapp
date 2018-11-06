webpackJsonp([84],{

/***/ 1815:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddonModFeedbackNonRespondentsPageModule", function() { return AddonModFeedbackNonRespondentsPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__components_components_module__ = __webpack_require__(924);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__nonrespondents__ = __webpack_require__(1936);
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







var AddonModFeedbackNonRespondentsPageModule = /** @class */ (function () {
    function AddonModFeedbackNonRespondentsPageModule() {
    }
    AddonModFeedbackNonRespondentsPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_6__nonrespondents__["a" /* AddonModFeedbackNonRespondentsPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_3__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__components_components_module__["a" /* AddonModFeedbackComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_6__nonrespondents__["a" /* AddonModFeedbackNonRespondentsPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], AddonModFeedbackNonRespondentsPageModule);
    return AddonModFeedbackNonRespondentsPageModule;
}());

//# sourceMappingURL=nonrespondents.module.js.map

/***/ }),

/***/ 1936:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AddonModFeedbackNonRespondentsPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__providers_feedback__ = __webpack_require__(85);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_helper__ = __webpack_require__(246);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_groups__ = __webpack_require__(46);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_utils_dom__ = __webpack_require__(8);
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
 * Page that displays feedback non respondents.
 */
var AddonModFeedbackNonRespondentsPage = /** @class */ (function () {
    function AddonModFeedbackNonRespondentsPage(navParams, feedbackProvider, groupsProvider, domUtils, feedbackHelper, navCtrl) {
        this.feedbackProvider = feedbackProvider;
        this.groupsProvider = groupsProvider;
        this.domUtils = domUtils;
        this.feedbackHelper = feedbackHelper;
        this.navCtrl = navCtrl;
        this.page = 0;
        this.groupInfo = {
            groups: [],
            separateGroups: false,
            visibleGroups: false
        };
        this.users = [];
        this.total = 0;
        this.canLoadMore = false;
        this.feedbackLoaded = false;
        this.loadingMore = false;
        var module = navParams.get('module');
        this.moduleId = module.id;
        this.feedbackId = module.instance;
        this.courseId = navParams.get('courseId');
        this.selectedGroup = navParams.get('group') || 0;
    }
    /**
     * View loaded.
     */
    AddonModFeedbackNonRespondentsPage.prototype.ionViewDidLoad = function () {
        this.fetchData();
    };
    /**
     * Fetch all the data required for the view.
     *
     * @param {boolean} [refresh] Empty events array first.
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonModFeedbackNonRespondentsPage.prototype.fetchData = function (refresh) {
        var _this = this;
        if (refresh === void 0) { refresh = false; }
        this.page = 0;
        this.total = 0;
        this.users = [];
        return this.groupsProvider.getActivityGroupInfo(this.moduleId).then(function (groupInfo) {
            _this.groupInfo = groupInfo;
            return _this.loadGroupUsers(_this.selectedGroup);
        }).catch(function (message) {
            _this.domUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);
            if (!refresh) {
                // Some call failed on first fetch, go back.
                _this.navCtrl.pop();
            }
            return Promise.reject(null);
        });
    };
    /**
     * Load Group responses.
     *
     * @param  {number} [groupId]   If defined it will change group if not, it will load more users for the same group.
     * @return {Promise<any>}       Resolved with the attempts loaded.
     */
    AddonModFeedbackNonRespondentsPage.prototype.loadGroupUsers = function (groupId) {
        var _this = this;
        if (typeof groupId == 'undefined') {
            this.page++;
            this.loadingMore = true;
        }
        else {
            this.selectedGroup = groupId;
            this.page = 0;
            this.total = 0;
            this.users = [];
            this.feedbackLoaded = false;
        }
        return this.feedbackHelper.getNonRespondents(this.feedbackId, this.selectedGroup, this.page).then(function (response) {
            _this.total = response.total;
            if (_this.users.length < response.total) {
                _this.users = _this.users.concat(response.users);
            }
            _this.canLoadMore = _this.users.length < response.total;
            return response;
        }).finally(function () {
            _this.loadingMore = false;
            _this.feedbackLoaded = true;
        });
    };
    /**
     * Change selected group or load more users.
     *
     * @param {number} [groupId] Group ID selected. If not defined, it will load more users.
     */
    AddonModFeedbackNonRespondentsPage.prototype.loadAttempts = function (groupId) {
        var _this = this;
        this.loadGroupUsers(groupId).catch(function (message) {
            _this.domUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);
        });
    };
    /**
     * Refresh the attempts.
     *
     * @param {any} refresher Refresher.
     */
    AddonModFeedbackNonRespondentsPage.prototype.refreshFeedback = function (refresher) {
        var _this = this;
        if (this.feedbackLoaded) {
            var promises = [];
            promises.push(this.feedbackProvider.invalidateNonRespondentsData(this.feedbackId));
            promises.push(this.groupsProvider.invalidateActivityGroupInfo(this.moduleId));
            Promise.all(promises).finally(function () {
                return _this.fetchData(true);
            }).finally(function () {
                refresher.complete();
            });
        }
    };
    AddonModFeedbackNonRespondentsPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-addon-mod-feedback-nonrespondents',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/addon/mod/feedback/pages/nonrespondents/nonrespondents.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{ \'addon.mod_feedback.responses\' |translate }}</ion-title>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ion-refresher [enabled]="feedbackLoaded" (ionRefresh)="refreshFeedback($event)">\n        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n    </ion-refresher>\n    <core-loading [hideUntil]="feedbackLoaded">\n        <ion-list no-margin>\n            <ion-item text-wrap *ngIf="groupInfo.separateGroups || groupInfo.visibleGroups">\n                <ion-label id="addon-feedback-groupslabel" *ngIf="groupInfo.separateGroups">{{ \'core.groupsseparate\' | translate }}</ion-label>\n                <ion-label id="addon-feedback-groupslabel" *ngIf="groupInfo.visibleGroups">{{ \'core.groupsvisible\' | translate }}</ion-label>\n                <ion-select [(ngModel)]="selectedGroup" (ionChange)="loadAttempts(selectedGroup)" aria-labelledby="addon-feedback-groupslabel" interface="popover">\n                    <ion-option *ngFor="let groupOpt of groupInfo.groups" [value]="groupOpt.id">{{groupOpt.name}}</ion-option>\n                </ion-select>\n            </ion-item>\n            <ion-item-divider color="light">\n                {{ \'addon.mod_feedback.non_respondents_students\' | translate : {$a: total } }}\n            </ion-item-divider>\n            <ng-container *ngIf="total > 0">\n                <ion-item *ngFor="let user of users" text-wrap>\n                    <ion-avatar item-start>\n                        <img [src]="user.profileimageurl" [alt]="\'core.pictureof\' | translate:{$a: user.fullname}" core-external-content onError="this.src=\'assets/img/user-avatar.png\'">\n                    </ion-avatar>\n                    <h2><core-format-text [text]="user.fullname"></core-format-text></h2>\n                    <p>\n                        <ion-badge color="success" *ngIf="user.started">\n                            {{ \'addon.mod_feedback.started\' | translate}}\n                        </ion-badge>\n                        <ion-badge color="danger" *ngIf="!user.started">\n                            {{ \'addon.mod_feedback.not_started\' | translate}}\n                        </ion-badge>\n                    </p>\n                </ion-item>\n            </ng-container>\n            <ion-item padding text-center *ngIf="canLoadMore">\n                <!-- Button and spinner to show more attempts. -->\n                <button ion-button block *ngIf="!loadingMore" (click)="loadAttempts()">{{ \'core.loadmore\' | translate }}</button>\n                <ion-spinner *ngIf="loadingMore"></ion-spinner>\n            </ion-item>\n        </ion-list>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/addon/mod/feedback/pages/nonrespondents/nonrespondents.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_2__providers_feedback__["a" /* AddonModFeedbackProvider */],
            __WEBPACK_IMPORTED_MODULE_4__providers_groups__["a" /* CoreGroupsProvider */], __WEBPACK_IMPORTED_MODULE_5__providers_utils_dom__["a" /* CoreDomUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_3__providers_helper__["a" /* AddonModFeedbackHelperProvider */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */]])
    ], AddonModFeedbackNonRespondentsPage);
    return AddonModFeedbackNonRespondentsPage;
}());

//# sourceMappingURL=nonrespondents.js.map

/***/ })

});
//# sourceMappingURL=84.js.map