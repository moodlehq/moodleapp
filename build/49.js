webpackJsonp([49],{

/***/ 1854:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreCommentsViewerPageModule", function() { return CoreCommentsViewerPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__viewer__ = __webpack_require__(1980);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__components_components_module__ = __webpack_require__(387);
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







var CoreCommentsViewerPageModule = /** @class */ (function () {
    function CoreCommentsViewerPageModule() {
    }
    CoreCommentsViewerPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_3__viewer__["a" /* CoreCommentsViewerPage */]
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_6__components_components_module__["a" /* CoreCommentsComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_3__viewer__["a" /* CoreCommentsViewerPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], CoreCommentsViewerPageModule);
    return CoreCommentsViewerPageModule;
}());

//# sourceMappingURL=viewer.module.js.map

/***/ }),

/***/ 1980:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreCommentsViewerPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__core_user_providers_user__ = __webpack_require__(26);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_comments__ = __webpack_require__(138);
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
 * Page that displays comments.
 */
var CoreCommentsViewerPage = /** @class */ (function () {
    function CoreCommentsViewerPage(navParams, sitesProvider, userProvider, domUtils, translate, commentsProvider) {
        this.userProvider = userProvider;
        this.domUtils = domUtils;
        this.translate = translate;
        this.commentsProvider = commentsProvider;
        this.comments = [];
        this.commentsLoaded = false;
        this.contextLevel = navParams.get('contextLevel');
        this.instanceId = navParams.get('instanceId');
        this.component = navParams.get('component');
        this.itemId = navParams.get('itemId');
        this.area = navParams.get('area') || '';
        this.page = navParams.get('page') || 0;
        this.title = navParams.get('title') || this.translate.instant('core.comments');
    }
    /**
     * View loaded.
     */
    CoreCommentsViewerPage.prototype.ionViewDidLoad = function () {
        var _this = this;
        this.fetchComments().finally(function () {
            _this.commentsLoaded = true;
        });
    };
    /**
     * Fetches the comments.
     *
     * @return {Promise<any>} Resolved when done.
     */
    CoreCommentsViewerPage.prototype.fetchComments = function () {
        var _this = this;
        // Get comments data.
        return this.commentsProvider.getComments(this.contextLevel, this.instanceId, this.component, this.itemId, this.area, this.page).then(function (comments) {
            _this.comments = comments;
            _this.comments.sort(function (a, b) { return b.timecreated - a.timecreated; });
            _this.comments.forEach(function (comment) {
                // Get the user profile image.
                _this.userProvider.getProfile(comment.userid, undefined, true).then(function (user) {
                    comment.profileimageurl = user.profileimageurl;
                });
            });
        }).catch(function (error) {
            if (error) {
                if (_this.component == 'assignsubmission_comments') {
                    _this.domUtils.showAlertTranslated('core.notice', 'core.commentsnotworking');
                }
                else {
                    _this.domUtils.showErrorModal(error);
                }
            }
            else {
                _this.domUtils.showErrorModal(_this.translate.instant('core.error') + ': get_comments');
            }
            return Promise.reject(null);
        });
    };
    /**
     * Refresh the comments.
     *
     * @param {any} refresher Refresher.
     */
    CoreCommentsViewerPage.prototype.refreshComments = function (refresher) {
        var _this = this;
        this.commentsProvider.invalidateCommentsData(this.contextLevel, this.instanceId, this.component, this.itemId, this.area, this.page).finally(function () {
            return _this.fetchComments().finally(function () {
                refresher.complete();
            });
        });
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])(__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */]),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */])
    ], CoreCommentsViewerPage.prototype, "content", void 0);
    CoreCommentsViewerPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-comments-viewer',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/comments/pages/viewer/viewer.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title><core-format-text [text]="title"></core-format-text></ion-title>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ion-refresher [enabled]="commentsLoaded" (ionRefresh)="refreshComments($event)">\n        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n    </ion-refresher>\n    <core-loading [hideUntil]="commentsLoaded">\n        <core-empty-box *ngIf="!comments || !comments.length" icon="chatbubbles" [message]="\'core.nocomments\' | translate"></core-empty-box>\n\n        <ion-card *ngFor="let comment of comments">\n            <ion-item text-wrap>\n                <ion-avatar item-start>\n                    <img [src]="comment.profileimageurl" onError="this.src=\'assets/img/user-avatar.png\'" core-external-content core-user-link [userId]="comment.userid" [alt]="\'core.pictureof\' | translate:{$a: comment.fullname}" role="presentation">\n                </ion-avatar>\n                <h2>{{ comment.fullname }}</h2>\n                <p>{{ comment.time }}</p>\n            </ion-item>\n            <ion-item text-wrap>\n                <core-format-text clean="true" [text]="comment.content"></core-format-text>\n            </ion-item>\n        </ion-card>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/comments/pages/viewer/viewer.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_3__providers_sites__["a" /* CoreSitesProvider */], __WEBPACK_IMPORTED_MODULE_5__core_user_providers_user__["a" /* CoreUserProvider */],
            __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["c" /* TranslateService */],
            __WEBPACK_IMPORTED_MODULE_6__providers_comments__["a" /* CoreCommentsProvider */]])
    ], CoreCommentsViewerPage);
    return CoreCommentsViewerPage;
}());

//# sourceMappingURL=viewer.js.map

/***/ })

});
//# sourceMappingURL=49.js.map