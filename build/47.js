webpackJsonp([47],{

/***/ 1856:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreCourseSectionSelectorPageModule", function() { return CoreCourseSectionSelectorPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__section_selector__ = __webpack_require__(1982);
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






var CoreCourseSectionSelectorPageModule = /** @class */ (function () {
    function CoreCourseSectionSelectorPageModule() {
    }
    CoreCourseSectionSelectorPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_5__section_selector__["a" /* CoreCourseSectionSelectorPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_3__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_5__section_selector__["a" /* CoreCourseSectionSelectorPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], CoreCourseSectionSelectorPageModule);
    return CoreCourseSectionSelectorPageModule;
}());

//# sourceMappingURL=section-selector.module.js.map

/***/ }),

/***/ 1982:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreCourseSectionSelectorPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__providers_helper__ = __webpack_require__(21);
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
 * Page that displays course section selector.
 */
var CoreCourseSectionSelectorPage = /** @class */ (function () {
    function CoreCourseSectionSelectorPage(navParams, courseHelper, viewCtrl) {
        this.viewCtrl = viewCtrl;
        this.sections = navParams.get('sections');
        this.selected = navParams.get('selected');
    }
    /**
     * Close the modal.
     */
    CoreCourseSectionSelectorPage.prototype.closeModal = function () {
        this.viewCtrl.dismiss();
    };
    /**
     * Select a section.
     *
     * @param {any} section Selected section object.
     */
    CoreCourseSectionSelectorPage.prototype.selectSection = function (section) {
        if (section.uservisible !== false) {
            this.viewCtrl.dismiss(section);
        }
    };
    CoreCourseSectionSelectorPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-course-section-selector',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/course/pages/section-selector/section-selector.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{ \'core.course.sections\' | translate }}</ion-title>\n        <ion-buttons end>\n            <button ion-button icon-only (click)="closeModal()" [attr.aria-label]="\'core.close\' | translate">\n                <ion-icon name="close"></ion-icon>\n            </button>\n        </ion-buttons>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ng-container *ngFor="let section of sections">\n        <a ion-item *ngIf="section.hasContent" text-wrap (click)="selectSection(section)" [class.core-primary-item]="selected.id == section.id" [class.item-dimmed]="section.visible === 0 || section.uservisible === false" detail-none>\n            <core-icon name="fa-folder" item-start></core-icon>\n            <h2><core-format-text [text]="section.formattedName || section.name"></core-format-text></h2>\n            <ion-badge color="secondary" *ngIf="section.visible === 0 && section.uservisible !== false">{{ \'core.course.hiddenfromstudents\' | translate }}</ion-badge>\n            <ion-badge color="secondary" *ngIf="section.availabilityinfo"><core-format-text  [text]=" section.availabilityinfo"></core-format-text></ion-badge>\n        </a>\n    </ng-container>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/course/pages/section-selector/section-selector.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_2__providers_helper__["a" /* CoreCourseHelperProvider */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["D" /* ViewController */]])
    ], CoreCourseSectionSelectorPage);
    return CoreCourseSectionSelectorPage;
}());

//# sourceMappingURL=section-selector.js.map

/***/ })

});
//# sourceMappingURL=47.js.map