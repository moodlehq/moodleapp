webpackJsonp([73],{

/***/ 1826:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddonModLessonMenuModalPageModule", function() { return AddonModLessonMenuModalPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__menu_modal__ = __webpack_require__(1947);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__ngx_translate_core__ = __webpack_require__(1);
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






var AddonModLessonMenuModalPageModule = /** @class */ (function () {
    function AddonModLessonMenuModalPageModule() {
    }
    AddonModLessonMenuModalPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_4__menu_modal__["a" /* AddonModLessonMenuModalPage */]
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_2__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_3__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_4__menu_modal__["a" /* AddonModLessonMenuModalPage */]),
                __WEBPACK_IMPORTED_MODULE_5__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ]
        })
    ], AddonModLessonMenuModalPageModule);
    return AddonModLessonMenuModalPageModule;
}());

//# sourceMappingURL=menu-modal.module.js.map

/***/ }),

/***/ 1947:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AddonModLessonMenuModalPage; });
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
 * Modal that renders the lesson menu and media file.
 */
var AddonModLessonMenuModalPage = /** @class */ (function () {
    function AddonModLessonMenuModalPage(params, viewCtrl) {
        this.viewCtrl = viewCtrl;
        this.pageInstance = params.get('page');
    }
    /**
     * Close modal.
     */
    AddonModLessonMenuModalPage.prototype.closeModal = function () {
        this.viewCtrl.dismiss();
    };
    /**
     * Load a certain page.
     *
     * @param {number} pageId The page ID to load.
     */
    AddonModLessonMenuModalPage.prototype.loadPage = function (pageId) {
        this.pageInstance.changePage && this.pageInstance.changePage(pageId);
        this.closeModal();
    };
    AddonModLessonMenuModalPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-addon-mod-lesson-menu-modal',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/addon/mod/lesson/pages/menu-modal/menu-modal.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{ pageInstance.lesson.name }}</ion-title>\n        <ion-buttons end>\n            <button ion-button icon-only (click)="closeModal()" [attr.aria-label]="\'core.close\' | translate">\n                <ion-icon name="close"></ion-icon>\n            </button>\n        </ion-buttons>\n    </ion-navbar>\n</ion-header>\n<ion-content class="addon-mod_lesson-menu-modal">\n    <nav>\n        <ion-list>\n            <!-- Media file. -->\n            <ng-container *ngIf="pageInstance.mediaFile">\n                <ion-item-divider color="light"><h2>{{ \'addon.mod_lesson.linkedmedia\' | translate }}</h2></ion-item-divider>\n                <core-file [file]="pageInstance.mediaFile" [component]="pageInstance.component" [componentId]="pageInstance.lesson.coursemodule"></core-file>\n            </ng-container>\n\n            <!-- Lesson menu. -->\n            <ng-container *ngIf="pageInstance.displayMenu">\n                <ion-item-divider color="light"><h2>{{ \'addon.mod_lesson.lessonmenu\' | translate }}</h2></ion-item-divider>\n                <ion-item text-center *ngIf="pageInstance.loadingMenu">\n                    <ion-spinner></ion-spinner>\n                </ion-item>\n                <div *ngIf="!pageInstance.loadingMenu">\n                    <ng-container *ngFor="let page of pageInstance.lessonPages">\n                        <a ion-item text-wrap *ngIf="page.display && page.displayinmenublock" (click)="loadPage(page.id)" [ngClass]=\'{"addon-mod_lesson-selected core-white-push-arrow": !pageInstance.eolData && pageInstance.currentPage == page.id}\'>\n                            <p><core-format-text [text]="page.title"></core-format-text></p>\n                        </a>\n                    </ng-container>\n                </div>\n            </ng-container>\n        </ion-list>\n    </nav>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/addon/mod/lesson/pages/menu-modal/menu-modal.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["D" /* ViewController */]])
    ], AddonModLessonMenuModalPage);
    return AddonModLessonMenuModalPage;
}());

//# sourceMappingURL=menu-modal.js.map

/***/ })

});
//# sourceMappingURL=73.js.map