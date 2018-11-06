webpackJsonp([19],{

/***/ 1884:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreSettingsListPageModule", function() { return CoreSettingsListPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__list__ = __webpack_require__(2009);
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






var CoreSettingsListPageModule = /** @class */ (function () {
    function CoreSettingsListPageModule() {
    }
    CoreSettingsListPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_3__list__["a" /* CoreSettingsListPage */]
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_3__list__["a" /* CoreSettingsListPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], CoreSettingsListPageModule);
    return CoreSettingsListPageModule;
}());

//# sourceMappingURL=list.module.js.map

/***/ }),

/***/ 2009:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreSettingsListPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__providers_delegate__ = __webpack_require__(199);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_split_view_split_view__ = __webpack_require__(104);
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
 * Page that displays the list of settings pages.
 */
var CoreSettingsListPage = /** @class */ (function () {
    function CoreSettingsListPage(settingsDelegate, platorm, navParams) {
        this.settingsDelegate = settingsDelegate;
        this.isIOS = platorm.is('ios');
        this.selectedPage = navParams.get('page') || false;
    }
    /**
     * View loaded.
     */
    CoreSettingsListPage.prototype.ionViewDidLoad = function () {
        this.handlers = this.settingsDelegate.getHandlers();
        if (this.selectedPage) {
            this.openHandler(this.selectedPage);
        }
        else if (this.splitviewCtrl.isOn()) {
            this.openHandler('CoreSettingsGeneralPage');
        }
    };
    /**
     * Open a handler.
     *
     * @param {string} page Page to open.
     * @param {any} params Params of the page to open.
     */
    CoreSettingsListPage.prototype.openHandler = function (page, params) {
        this.selectedPage = page;
        this.splitviewCtrl.push(page, params);
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])(__WEBPACK_IMPORTED_MODULE_3__components_split_view_split_view__["a" /* CoreSplitViewComponent */]),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_3__components_split_view_split_view__["a" /* CoreSplitViewComponent */])
    ], CoreSettingsListPage.prototype, "splitviewCtrl", void 0);
    CoreSettingsListPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-settings-list',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/settings/pages/list/list.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{ \'core.settings.settings\' | translate}}</ion-title>\n        <ion-buttons end>\n        </ion-buttons>\n    </ion-navbar>\n</ion-header>\n<core-split-view>\n    <ion-content>\n        <ion-list>\n            <a ion-item (click)="openHandler(\'CoreSettingsGeneralPage\')" [title]="\'core.settings.general\' | translate"  [class.core-split-item-selected]="\'CoreSettingsGeneralPage\' == selectedPage" detail-push>\n                <ion-icon name="construct" item-start></ion-icon>\n                <p>{{ \'core.settings.general\' | translate }}</p>\n            </a>\n            <a ion-item (click)="openHandler(\'CoreSettingsSpaceUsagePage\')" [title]="\'core.settings.spaceusage\' | translate" [class.core-split-item-selected]="\'CoreSettingsSpaceUsagePage\' == selectedPage" detail-push>\n                <ion-icon name="stats" item-start></ion-icon>\n                <p>{{ \'core.settings.spaceusage\' | translate }}</p>\n            </a>\n            <a ion-item (click)="openHandler(\'CoreSettingsSynchronizationPage\')" [title]="\'core.settings.synchronization\' | translate" [class.core-split-item-selected]="\'CoreSettingsSynchronizationPage\' == selectedPage" detail-push>\n                <ion-icon name="sync" item-start></ion-icon>\n                <p>{{ \'core.settings.synchronization\' | translate }}</p>\n            </a>\n            <a ion-item *ngIf="isIOS" (click)="openHandler(\'CoreSharedFilesListPage\', {manage: true})" [title]="\'core.sharedfiles.sharedfiles\' | translate" [class.core-split-item-selected]="\'CoreSharedFilesListPage\' == selectedPage" detail-push>\n                <ion-icon name="folder" item-start></ion-icon>\n                <p>{{ \'core.sharedfiles.sharedfiles\' | translate }}</p>\n            </a>\n\n            <a ion-item *ngFor="let handler of handlers" [ngClass]="[\'core-settings-handler\', handler.class]" (click)="openHandler(handler.page, handler.params)" [title]="handler.title | translate" detail-push [class.core-split-item-selected]="handler.page == selectedPage">\n                <core-icon [name]="handler.icon" item-start *ngIf="handler.icon"></core-icon>\n                <p>{{ handler.title | translate}}</p>\n            </a>\n\n            <a ion-item (click)="openHandler(\'CoreSettingsAboutPage\')" [title]="\'core.settings.about\' | translate" [class.core-split-item-selected]="\'CoreSettingsAboutPage\' == selectedPage" detail-push>\n                <ion-icon name="contacts" item-start></ion-icon>\n                <p>{{ \'core.settings.about\' | translate }}</p>\n            </a>\n        </ion-list>\n    </ion-content>\n</core-split-view>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/settings/pages/list/list.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_2__providers_delegate__["a" /* CoreSettingsDelegate */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["u" /* Platform */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */]])
    ], CoreSettingsListPage);
    return CoreSettingsListPage;
}());

//# sourceMappingURL=list.js.map

/***/ })

});
//# sourceMappingURL=19.js.map