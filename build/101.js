webpackJsonp([101],{

/***/ 1798:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddonModAssignEditFeedbackModalPageModule", function() { return AddonModAssignEditFeedbackModalPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__edit_feedback_modal__ = __webpack_require__(1919);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__components_components_module__ = __webpack_require__(925);
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







var AddonModAssignEditFeedbackModalPageModule = /** @class */ (function () {
    function AddonModAssignEditFeedbackModalPageModule() {
    }
    AddonModAssignEditFeedbackModalPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_2__edit_feedback_modal__["a" /* AddonModAssignEditFeedbackModalPage */]
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_6__components_components_module__["a" /* AddonModAssignComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_2__edit_feedback_modal__["a" /* AddonModAssignEditFeedbackModalPage */]),
                __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ]
        })
    ], AddonModAssignEditFeedbackModalPageModule);
    return AddonModAssignEditFeedbackModalPageModule;
}());

//# sourceMappingURL=edit-feedback-modal.module.js.map

/***/ }),

/***/ 1919:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AddonModAssignEditFeedbackModalPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_feedback_delegate__ = __webpack_require__(113);
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
 * Modal that allows editing a feedback plugin.
 */
var AddonModAssignEditFeedbackModalPage = /** @class */ (function () {
    function AddonModAssignEditFeedbackModalPage(params, viewCtrl, domUtils, translate, feedbackDelegate) {
        this.viewCtrl = viewCtrl;
        this.domUtils = domUtils;
        this.translate = translate;
        this.feedbackDelegate = feedbackDelegate;
        this.forceLeave = false; // To allow leaving the page without checking for changes.
        this.assign = params.get('assign');
        this.submission = params.get('submission');
        this.plugin = params.get('plugin');
        this.userId = params.get('userId');
    }
    /**
     * Check if we can leave the page or not.
     *
     * @return {boolean|Promise<void>} Resolved if we can leave it, rejected if not.
     */
    AddonModAssignEditFeedbackModalPage.prototype.ionViewCanLeave = function () {
        var _this = this;
        if (this.forceLeave) {
            return true;
        }
        return this.hasDataChanged().then(function (changed) {
            if (changed) {
                return _this.domUtils.showConfirm(_this.translate.instant('core.confirmcanceledit'));
            }
        });
    };
    /**
     * Close modal.
     *
     * @param {any} data Data to return to the page.
     */
    AddonModAssignEditFeedbackModalPage.prototype.closeModal = function (data) {
        this.viewCtrl.dismiss(data);
    };
    /**
     * Done editing.
     */
    AddonModAssignEditFeedbackModalPage.prototype.done = function () {
        // Close the modal, sending the input data.
        this.forceLeave = true;
        this.closeModal(this.getInputData());
    };
    /**
     * Get the input data.
     *
     * @return {any} Object with the data.
     */
    AddonModAssignEditFeedbackModalPage.prototype.getInputData = function () {
        return this.domUtils.getDataFromForm(document.forms['addon-mod_assign-edit-feedback-form']);
    };
    /**
     * Check if data has changed.
     *
     * @return {Promise<boolean>} Promise resolved with boolean: whether the data has changed.
     */
    AddonModAssignEditFeedbackModalPage.prototype.hasDataChanged = function () {
        return this.feedbackDelegate.hasPluginDataChanged(this.assign, this.userId, this.plugin, this.getInputData(), this.userId)
            .catch(function () {
            // Ignore errors.
            return true;
        });
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["D" /* Input */])(),
        __metadata("design:type", Object)
    ], AddonModAssignEditFeedbackModalPage.prototype, "assign", void 0);
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["D" /* Input */])(),
        __metadata("design:type", Object)
    ], AddonModAssignEditFeedbackModalPage.prototype, "submission", void 0);
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["D" /* Input */])(),
        __metadata("design:type", Object)
    ], AddonModAssignEditFeedbackModalPage.prototype, "plugin", void 0);
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["D" /* Input */])(),
        __metadata("design:type", Number)
    ], AddonModAssignEditFeedbackModalPage.prototype, "userId", void 0);
    AddonModAssignEditFeedbackModalPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-addon-mod-assign-edit-feedback-modal',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/addon/mod/assign/pages/edit-feedback-modal/edit-feedback-modal.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title><core-format-text [text]="plugin.name"></core-format-text></ion-title>\n        <ion-buttons end>\n            <button ion-button icon-only (click)="closeModal()" [attr.aria-label]="\'core.close\' | translate">\n                <ion-icon name="close"></ion-icon>\n            </button>\n        </ion-buttons>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <form name="addon-mod_assign-edit-feedback-form" *ngIf="userId && plugin">\n        <addon-mod-assign-feedback-plugin [assign]="assign" [submission]="submission" [userId]="userId" [plugin]="plugin" [edit]="true"></addon-mod-assign-feedback-plugin>\n        <button ion-button block (click)="done()">{{ \'core.done\' | translate }}</button>\n    </form>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/addon/mod/assign/pages/edit-feedback-modal/edit-feedback-modal.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["D" /* ViewController */], __WEBPACK_IMPORTED_MODULE_3__providers_utils_dom__["a" /* CoreDomUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["c" /* TranslateService */], __WEBPACK_IMPORTED_MODULE_4__providers_feedback_delegate__["a" /* AddonModAssignFeedbackDelegate */]])
    ], AddonModAssignEditFeedbackModalPage);
    return AddonModAssignEditFeedbackModalPage;
}());

//# sourceMappingURL=edit-feedback-modal.js.map

/***/ })

});
//# sourceMappingURL=101.js.map