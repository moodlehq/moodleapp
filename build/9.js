webpackJsonp([9],{

/***/ 1895:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreUserProfilePageModule", function() { return CoreUserProfilePageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__profile__ = __webpack_require__(2020);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__components_components_module__ = __webpack_require__(16);
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






var CoreUserProfilePageModule = /** @class */ (function () {
    function CoreUserProfilePageModule() {
    }
    CoreUserProfilePageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_3__profile__["a" /* CoreUserProfilePage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_5__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_3__profile__["a" /* CoreUserProfilePage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], CoreUserProfilePageModule);
    return CoreUserProfilePageModule;
}());

//# sourceMappingURL=profile.module.js.map

/***/ }),

/***/ 2020:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreUserProfilePage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__providers_user__ = __webpack_require__(26);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_helper__ = __webpack_require__(930);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__core_courses_providers_courses__ = __webpack_require__(40);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__providers_events__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__providers_utils_mimetype__ = __webpack_require__(68);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__core_fileuploader_providers_helper__ = __webpack_require__(109);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__providers_user_delegate__ = __webpack_require__(56);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12__components_split_view_split_view__ = __webpack_require__(104);
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
 * Page that displays an user profile page.
 */
var CoreUserProfilePage = /** @class */ (function () {
    function CoreUserProfilePage(navParams, userProvider, userHelper, domUtils, translate, eventsProvider, coursesProvider, sitesProvider, mimetypeUtils, fileUploaderHelper, userDelegate, navCtrl, svComponent) {
        var _this = this;
        this.userProvider = userProvider;
        this.userHelper = userHelper;
        this.domUtils = domUtils;
        this.translate = translate;
        this.eventsProvider = eventsProvider;
        this.coursesProvider = coursesProvider;
        this.sitesProvider = sitesProvider;
        this.mimetypeUtils = mimetypeUtils;
        this.fileUploaderHelper = fileUploaderHelper;
        this.userDelegate = userDelegate;
        this.navCtrl = navCtrl;
        this.svComponent = svComponent;
        this.userLoaded = false;
        this.isLoadingHandlers = false;
        this.isDeleted = false;
        this.canChangeProfilePicture = false;
        this.actionHandlers = [];
        this.newPageHandlers = [];
        this.communicationHandlers = [];
        this.userId = navParams.get('userId');
        this.courseId = navParams.get('courseId');
        this.site = this.sitesProvider.getCurrentSite();
        // Allow to change the profile image only in the app profile page.
        this.canChangeProfilePicture =
            (!this.courseId || this.courseId == this.site.getSiteHomeId()) &&
                this.userId == this.site.getUserId() &&
                this.site.canUploadFiles() &&
                this.site.wsAvailable('core_user_update_picture') &&
                !this.userProvider.isUpdatePictureDisabledInSite(this.site);
        this.obsProfileRefreshed = eventsProvider.on(__WEBPACK_IMPORTED_MODULE_2__providers_user__["a" /* CoreUserProvider */].PROFILE_REFRESHED, function (data) {
            if (_this.user && typeof data.user != 'undefined') {
                _this.user.email = data.user.email;
                _this.user.address = _this.userHelper.formatAddress('', data.user.city, data.user.country);
            }
        }, sitesProvider.getCurrentSiteId());
    }
    /**
     * View loaded.
     */
    CoreUserProfilePage.prototype.ionViewDidLoad = function () {
        var _this = this;
        this.fetchUser().then(function () {
            return _this.userProvider.logView(_this.userId, _this.courseId).catch(function (error) {
                _this.isDeleted = error.errorcode === 'userdeleted';
            });
        }).finally(function () {
            _this.userLoaded = true;
        });
    };
    /**
     * Fetches the user and updates the view.
     */
    CoreUserProfilePage.prototype.fetchUser = function () {
        var _this = this;
        return this.userProvider.getProfile(this.userId, this.courseId).then(function (user) {
            user.address = _this.userHelper.formatAddress('', user.city, user.country);
            user.roles = _this.userHelper.formatRoleList(user.roles);
            _this.user = user;
            _this.title = user.fullname;
            _this.subscription = _this.userDelegate.getProfileHandlersFor(user, _this.courseId).subscribe(function (handlers) {
                _this.actionHandlers = [];
                _this.newPageHandlers = [];
                _this.communicationHandlers = [];
                handlers.forEach(function (handler) {
                    switch (handler.type) {
                        case __WEBPACK_IMPORTED_MODULE_11__providers_user_delegate__["a" /* CoreUserDelegate */].TYPE_COMMUNICATION:
                            _this.communicationHandlers.push(handler.data);
                            break;
                        case __WEBPACK_IMPORTED_MODULE_11__providers_user_delegate__["a" /* CoreUserDelegate */].TYPE_ACTION:
                            _this.actionHandlers.push(handler.data);
                            break;
                        case __WEBPACK_IMPORTED_MODULE_11__providers_user_delegate__["a" /* CoreUserDelegate */].TYPE_NEW_PAGE:
                        default:
                            _this.newPageHandlers.push(handler.data);
                            break;
                    }
                });
                _this.isLoadingHandlers = !_this.userDelegate.areHandlersLoaded(user.id);
            });
        }).catch(function (error) {
            // Error is null for deleted users, do not show the modal.
            if (error) {
                _this.domUtils.showErrorModal(error);
            }
        });
    };
    /**
     * Opens dialog to change profile picture.
     */
    CoreUserProfilePage.prototype.changeProfilePicture = function () {
        var _this = this;
        var maxSize = -1, title = this.translate.instant('core.user.newpicture'), mimetypes = this.mimetypeUtils.getGroupMimeInfo('image', 'mimetypes');
        return this.fileUploaderHelper.selectAndUploadFile(maxSize, title, mimetypes).then(function (result) {
            var modal = _this.domUtils.showModalLoading('core.sending', true);
            return _this.userProvider.changeProfilePicture(result.itemid, _this.userId).then(function (profileImageURL) {
                _this.eventsProvider.trigger(__WEBPACK_IMPORTED_MODULE_2__providers_user__["a" /* CoreUserProvider */].PROFILE_PICTURE_UPDATED, {
                    userId: _this.userId,
                    picture: profileImageURL
                });
                _this.sitesProvider.updateSiteInfo(_this.site.getId());
                _this.refreshUser();
            }).finally(function () {
                modal.dismiss();
            });
        }).catch(function (message) {
            if (message) {
                _this.domUtils.showErrorModal(message);
            }
        });
    };
    /**
     * Refresh the user.
     *
     * @param {any} refresher Refresher.
     */
    CoreUserProfilePage.prototype.refreshUser = function (refresher) {
        var _this = this;
        var promises = [];
        promises.push(this.userProvider.invalidateUserCache(this.userId));
        promises.push(this.coursesProvider.invalidateUserNavigationOptions());
        promises.push(this.coursesProvider.invalidateUserAdministrationOptions());
        Promise.all(promises).finally(function () {
            _this.fetchUser().finally(function () {
                _this.eventsProvider.trigger(__WEBPACK_IMPORTED_MODULE_2__providers_user__["a" /* CoreUserProvider */].PROFILE_REFRESHED, {
                    courseId: _this.courseId,
                    userId: _this.userId,
                    user: _this.user
                }, _this.site.getId());
                refresher && refresher.complete();
            });
        });
    };
    /**
     * Open the page with the user details.
     */
    CoreUserProfilePage.prototype.openUserDetails = function () {
        // Decide which navCtrl to use. If this page is inside a split view, use the split view's master nav.
        var navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;
        navCtrl.push('CoreUserAboutPage', { courseId: this.courseId, userId: this.userId });
    };
    /**
     * A handler was clicked.
     *
     * @param {Event} event Click event.
     * @param {CoreUserProfileHandlerData} handler Handler that was clicked.
     */
    CoreUserProfilePage.prototype.handlerClicked = function (event, handler) {
        // Decide which navCtrl to use. If this page is inside a split view, use the split view's master nav.
        var navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;
        handler.action(event, navCtrl, this.user, this.courseId);
    };
    /**
     * Page destroyed.
     */
    CoreUserProfilePage.prototype.ngOnDestroy = function () {
        this.subscription && this.subscription.unsubscribe();
        this.obsProfileRefreshed && this.obsProfileRefreshed.off();
    };
    CoreUserProfilePage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-user-profile',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/user/pages/profile/profile.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title><core-format-text [text]="title"></core-format-text></ion-title>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ion-refresher [enabled]="userLoaded" (ionRefresh)="refreshUser($event)">\n        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n    </ion-refresher>\n    <core-loading [hideUntil]="userLoaded">\n        <ion-list *ngIf="user && !isDeleted">\n            <ion-item text-center>\n                <div class="item-avatar-center">\n                    <img class="avatar" [src]="user.profileimageurl" core-external-content alt="{{ \'core.pictureof\' | translate:{$a: user.fullname} }}" role="presentation" onError="this.src=\'assets/img/user-avatar.png\'">\n                    <ion-icon name="create" class="core-icon-foreground" *ngIf="canChangeProfilePicture" (click)="changeProfilePicture()"></ion-icon>\n                </div>\n                <h2><core-format-text [text]="user.fullname"></core-format-text></h2>\n                <p><core-format-text *ngIf="user.address" [text]="user.address"></core-format-text></p>\n                <p *ngIf="user.roles">\n                    <strong>{{ \'core.user.roles\' | translate}}</strong>{{\'core.labelsep\' | translate}}\n                    <core-format-text [text]="user.roles"></core-format-text>\n                </p>\n            </ion-item>\n\n            <ion-grid class="core-user-communication-handlers" *ngIf="(communicationHandlers && communicationHandlers.length) || isLoadingHandlers">\n                <ion-row no-padding justify-content-between *ngIf="communicationHandlers && communicationHandlers.length">\n                    <ion-col align-self-center *ngFor="let comHandler of communicationHandlers" text-center>\n                        <a (click)="handlerClicked($event, comHandler)" [ngClass]="[\'core-user-profile-handler\', comHandler.class]" title="{{comHandler.title | translate}}" tappable>\n                            <core-icon [name]="comHandler.icon"></core-icon>\n                            <p>{{comHandler.title | translate}}</p>\n                        </a>\n                    </ion-col>\n                </ion-row>\n                <ion-row no-padding>\n                    <ion-col text-center class="core-loading-handlers" *ngIf="isLoadingHandlers">\n                        <ion-spinner></ion-spinner>\n                    </ion-col>\n                </ion-row>\n            </ion-grid>\n\n            <a ion-item text-wrap class="core-user-profile-handler" (click)="openUserDetails()" title="{{ \'core.user.details\' | translate }}">\n                <ion-icon name="person" item-start></ion-icon>\n                <h2>{{ \'core.user.details\' | translate }}</h2>\n            </a>\n            <ion-item text-center class="core-loading-handlers" *ngIf="isLoadingHandlers">\n                <ion-spinner></ion-spinner>\n            </ion-item>\n\n            <a *ngFor="let npHandler of newPageHandlers" ion-item text-wrap [ngClass]="[\'core-user-profile-handler\', npHandler.class]" (click)="handlerClicked($event, npHandler)" [hidden]="npHandler.hidden" title="{{ npHandler.title | translate }}">\n                <core-icon *ngIf="npHandler.icon" [name]="npHandler.icon" item-start></core-icon>\n                <h2>{{ npHandler.title | translate }}</h2>\n            </a>\n\n            <ion-item *ngIf="actionHandlers && actionHandlers.length">\n                <button *ngFor="let actHandler of actionHandlers" ion-button block outline [ngClass]="[\'core-user-profile-handler\', actHandler.class]" (click)="handlerClicked($event, actHandler)" [hidden]="actHandler.hidden" title="{{ actHandler.title | translate }}" icon-start [disabled]="actHandler.spinner">\n                    <core-icon *ngIf="actHandler.icon" [name]="actHandler.icon" start></core-icon>\n                    <span>{{ actHandler.title | translate }}</span>\n                    <ion-spinner *ngIf="actHandler.spinner"></ion-spinner>\n                </button>\n            </ion-item>\n        </ion-list>\n        <core-empty-box *ngIf="!user && !isDeleted" icon="person" [message]=" \'core.user.detailsnotavailable\' | translate"></core-empty-box>\n\n        <core-empty-box *ngIf="isDeleted" icon="person" [message]="\'core.userdeleted\' | translate"></core-empty-box>\n    </core-loading>\n</ion-content>'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/user/pages/profile/profile.html"*/,
        }),
        __param(12, Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["N" /* Optional */])()),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_2__providers_user__["a" /* CoreUserProvider */], __WEBPACK_IMPORTED_MODULE_3__providers_helper__["a" /* CoreUserHelperProvider */],
            __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_5__ngx_translate_core__["c" /* TranslateService */], __WEBPACK_IMPORTED_MODULE_7__providers_events__["a" /* CoreEventsProvider */],
            __WEBPACK_IMPORTED_MODULE_6__core_courses_providers_courses__["a" /* CoreCoursesProvider */], __WEBPACK_IMPORTED_MODULE_8__providers_sites__["a" /* CoreSitesProvider */],
            __WEBPACK_IMPORTED_MODULE_9__providers_utils_mimetype__["a" /* CoreMimetypeUtilsProvider */], __WEBPACK_IMPORTED_MODULE_10__core_fileuploader_providers_helper__["a" /* CoreFileUploaderHelperProvider */],
            __WEBPACK_IMPORTED_MODULE_11__providers_user_delegate__["a" /* CoreUserDelegate */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */],
            __WEBPACK_IMPORTED_MODULE_12__components_split_view_split_view__["a" /* CoreSplitViewComponent */]])
    ], CoreUserProfilePage);
    return CoreUserProfilePage;
}());

//# sourceMappingURL=profile.js.map

/***/ })

});
//# sourceMappingURL=9.js.map