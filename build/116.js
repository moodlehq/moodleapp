webpackJsonp([116],{

/***/ 1781:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddonBadgesIssuedBadgePageModule", function() { return AddonBadgesIssuedBadgePageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__pipes_pipes_module__ = __webpack_require__(67);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__issued_badge__ = __webpack_require__(1902);
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







var AddonBadgesIssuedBadgePageModule = /** @class */ (function () {
    function AddonBadgesIssuedBadgePageModule() {
    }
    AddonBadgesIssuedBadgePageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_6__issued_badge__["a" /* AddonBadgesIssuedBadgePage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_3__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_5__pipes_pipes_module__["a" /* CorePipesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_6__issued_badge__["a" /* AddonBadgesIssuedBadgePage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], AddonBadgesIssuedBadgePageModule);
    return AddonBadgesIssuedBadgePageModule;
}());

//# sourceMappingURL=issued-badge.module.js.map

/***/ }),

/***/ 1902:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AddonBadgesIssuedBadgePage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__providers_badges__ = __webpack_require__(193);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_utils_time__ = __webpack_require__(22);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__core_user_providers_user__ = __webpack_require__(26);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__core_courses_providers_courses__ = __webpack_require__(40);
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
 * Page that displays the list of calendar events.
 */
var AddonBadgesIssuedBadgePage = /** @class */ (function () {
    function AddonBadgesIssuedBadgePage(badgesProvider, navParams, sitesProvider, domUtils, timeUtils, userProvider, coursesProvider) {
        this.badgesProvider = badgesProvider;
        this.domUtils = domUtils;
        this.timeUtils = timeUtils;
        this.userProvider = userProvider;
        this.coursesProvider = coursesProvider;
        this.user = {};
        this.course = {};
        this.badge = {};
        this.badgeLoaded = false;
        this.currentTime = 0;
        this.courseId = navParams.get('courseId') || 0; // Use 0 for site badges.
        this.userId = navParams.get('userId') || sitesProvider.getCurrentSite().getUserId();
        this.badgeHash = navParams.get('badgeHash');
    }
    /**
     * View loaded.
     */
    AddonBadgesIssuedBadgePage.prototype.ionViewDidLoad = function () {
        var _this = this;
        this.fetchIssuedBadge().finally(function () {
            _this.badgeLoaded = true;
        });
    };
    /**
     * Fetch the issued badge required for the view.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonBadgesIssuedBadgePage.prototype.fetchIssuedBadge = function () {
        var _this = this;
        var promises = [];
        this.currentTime = this.timeUtils.timestamp();
        var promise = this.userProvider.getProfile(this.userId, this.courseId, true).then(function (user) {
            _this.user = user;
        });
        promises.push(promise);
        promise = this.badgesProvider.getUserBadges(this.courseId, this.userId).then(function (badges) {
            badges.forEach(function (badge) {
                if (_this.badgeHash == badge.uniquehash) {
                    _this.badge = badge;
                    if (badge.courseid) {
                        return _this.coursesProvider.getUserCourse(badge.courseid, true).then(function (course) {
                            _this.course = course;
                        }).catch(function () {
                            // Maybe an old deleted course.
                            _this.course = null;
                        });
                    }
                }
            });
        }).catch(function (message) {
            _this.domUtils.showErrorModalDefault(message, 'Error getting badge data.');
        });
        promises.push(promise);
        return Promise.all(promises);
    };
    /**
     * Refresh the badges.
     *
     * @param {any} refresher Refresher.
     */
    AddonBadgesIssuedBadgePage.prototype.refreshBadges = function (refresher) {
        var _this = this;
        this.badgesProvider.invalidateUserBadges(this.courseId, this.userId).finally(function () {
            _this.fetchIssuedBadge().finally(function () {
                refresher.complete();
            });
        });
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])(__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */]),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */])
    ], AddonBadgesIssuedBadgePage.prototype, "content", void 0);
    AddonBadgesIssuedBadgePage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-addon-badges-issued-badge',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/addon/badges/pages/issued-badge/issued-badge.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{badge.name}}</ion-title>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ion-refresher [enabled]="badgeLoaded" (ionRefresh)="refreshBadges($event)">\n        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n    </ion-refresher>\n    <core-loading [hideUntil]="badgeLoaded">\n\n        <ion-item-group>\n            <ion-item text-wrap class="item-avatar-center">\n                <img *ngIf="badge.badgeurl" class="avatar" [src]="badge.badgeurl" core-external-content [alt]="badge.name">\n                <ion-badge color="danger" *ngIf="badge.dateexpire && currentTime >= badge.dateexpire">\n                    {{ \'addon.badges.expired\' | translate }}\n                </ion-badge>\n            </ion-item>\n        </ion-item-group>\n\n        <ion-item-group *ngIf="user.fullname">\n            <ion-item-divider color="light">\n                <h2>{{ \'addon.badges.recipientdetails\' | translate}}</h2>\n            </ion-item-divider>\n            <ion-item text-wrap>\n                <h2>{{ \'core.name\' | translate}}</h2>\n                <p>\n                    <core-format-text clean="true" [text]="user.fullname"></core-format-text>\n                </p>\n            </ion-item>\n        </ion-item-group>\n\n        <ion-item-group>\n            <ion-item-divider color="light">\n                <h2>{{ \'addon.badges.issuerdetails\' | translate}}</h2>\n            </ion-item-divider>\n            <ion-item text-wrap *ngIf="badge.issuername">\n                <h2>{{ \'addon.badges.issuername\' | translate}}</h2>\n                <p>\n                    <core-format-text clean="true" [text]="badge.issuername"></core-format-text>\n                </p>\n            </ion-item>\n            <ion-item text-wrap *ngIf="badge.issuercontact">\n                <h2>{{ \'addon.badges.contact\' | translate}}</h2>\n                <p>\n                    <core-format-text clean="true" [text]="badge.issuercontact"></core-format-text>\n                </p>\n            </ion-item>\n        </ion-item-group>\n\n        <ion-item-group>\n            <ion-item-divider color="light">\n                <h2>{{ \'addon.badges.badgedetails\' | translate}}</h2>\n            </ion-item-divider>\n            <ion-item text-wrap *ngIf="badge.name">\n                <h2>{{ \'core.name\' | translate}}</h2>\n                <p>{{badge.name}}</p>\n            </ion-item>\n            <ion-item text-wrap *ngIf="badge.description">\n                <h2>{{ \'core.description\' | translate}}</h2>\n                <p>\n                    <core-format-text clean="true" [text]="badge.description"></core-format-text>\n                </p>\n            </ion-item>\n            <ion-item text-wrap *ngIf="course.fullname">\n                <h2>{{ \'core.course\' | translate}}</h2>\n                <p>\n                    <core-format-text [text]="course.fullname"></core-format-text>\n                </p>\n            </ion-item>\n        </ion-item-group>\n\n        <ion-item-group>\n            <ion-item-divider color="light">\n                <h2>{{ \'addon.badges.issuancedetails\' | translate}}</h2>\n            </ion-item-divider>\n            <ion-item text-wrap *ngIf="badge.dateissued">\n                <h2>{{ \'addon.badges.dateawarded\' | translate}}</h2>\n                <p>{{badge.dateissued | coreToLocaleString }}</p>\n            </ion-item>\n            <ion-item text-wrap *ngIf="badge.dateexpire">\n                <h2>{{ \'addon.badges.expirydate\' | translate}}</h2>\n                <p>{{badge.dateexpire | coreToLocaleString }}</p>\n            </ion-item>\n        </ion-item-group>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/addon/badges/pages/issued-badge/issued-badge.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_2__providers_badges__["a" /* AddonBadgesProvider */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_5__providers_sites__["a" /* CoreSitesProvider */],
            __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_3__providers_utils_time__["a" /* CoreTimeUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_6__core_user_providers_user__["a" /* CoreUserProvider */], __WEBPACK_IMPORTED_MODULE_7__core_courses_providers_courses__["a" /* CoreCoursesProvider */]])
    ], AddonBadgesIssuedBadgePage);
    return AddonBadgesIssuedBadgePage;
}());

//# sourceMappingURL=issued-badge.js.map

/***/ })

});
//# sourceMappingURL=116.js.map