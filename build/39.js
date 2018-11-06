webpackJsonp([39],{

/***/ 1864:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreCoursesSelfEnrolPasswordPageModule", function() { return CoreCoursesSelfEnrolPasswordPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__self_enrol_password__ = __webpack_require__(1989);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__ = __webpack_require__(1);
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






var CoreCoursesSelfEnrolPasswordPageModule = /** @class */ (function () {
    function CoreCoursesSelfEnrolPasswordPageModule() {
    }
    CoreCoursesSelfEnrolPasswordPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_2__self_enrol_password__["a" /* CoreCoursesSelfEnrolPasswordPage */]
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_2__self_enrol_password__["a" /* CoreCoursesSelfEnrolPasswordPage */]),
                __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__["b" /* TranslateModule */].forChild(),
            ]
        })
    ], CoreCoursesSelfEnrolPasswordPageModule);
    return CoreCoursesSelfEnrolPasswordPageModule;
}());

//# sourceMappingURL=self-enrol-password.module.js.map

/***/ }),

/***/ 1989:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreCoursesSelfEnrolPasswordPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
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
 * Page that displays a form to enter a password to self enrol in a course.
 */
var CoreCoursesSelfEnrolPasswordPage = /** @class */ (function () {
    function CoreCoursesSelfEnrolPasswordPage(viewCtrl) {
        this.viewCtrl = viewCtrl;
    }
    /**
     * Close help modal.
     */
    CoreCoursesSelfEnrolPasswordPage.prototype.close = function () {
        this.viewCtrl.dismiss();
    };
    /**
     * Submit password.
     *
     * @param {string} password Password to submit.
     */
    CoreCoursesSelfEnrolPasswordPage.prototype.submitPassword = function (password) {
        this.viewCtrl.dismiss(password);
    };
    CoreCoursesSelfEnrolPasswordPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-courses-self-enrol-password',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/courses/pages/self-enrol-password/self-enrol-password.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{ \'core.courses.selfenrolment\' | translate }}</ion-title>\n\n        <ion-buttons end>\n            <button ion-button icon-only (click)="close()" [attr.aria-label]="\'core.close\' | translate">\n                <ion-icon name="close"></ion-icon>\n            </button>\n        </ion-buttons>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <form ion-list #f="ngForm" (ngSubmit)="submitPassword(f.value.password)">\n        <ion-item>\n            <core-show-password item-content [name]="\'password\'">\n                <ion-input text-wrap class="core-ioninput-password" name="password" type="password" placeholder="{{ \'core.courses.password\' | translate }}" ngModel [core-auto-focus] [clearOnEdit]="false"></ion-input>\n            </core-show-password>\n        </ion-item>\n        <ion-item>\n            <button ion-button block [disabled]="!f.value.password">{{ \'core.courses.enrolme\' | translate }}</button>\n        </ion-item>\n    </form>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/courses/pages/self-enrol-password/self-enrol-password.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["D" /* ViewController */]])
    ], CoreCoursesSelfEnrolPasswordPage);
    return CoreCoursesSelfEnrolPasswordPage;
}());

//# sourceMappingURL=self-enrol-password.js.map

/***/ })

});
//# sourceMappingURL=39.js.map