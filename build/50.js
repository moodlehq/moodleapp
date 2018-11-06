webpackJsonp([50],{

/***/ 1853:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CorePlaceholderPageModule", function() { return CorePlaceholderPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__placeholder__ = __webpack_require__(1979);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_module__ = __webpack_require__(16);
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
// Code based on https://github.com/martinpritchardelevate/ionic-split-pane-demo





var CorePlaceholderPageModule = /** @class */ (function () {
    function CorePlaceholderPageModule() {
    }
    CorePlaceholderPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_2__placeholder__["a" /* CoreSplitViewPlaceholderPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_2__placeholder__["a" /* CoreSplitViewPlaceholderPage */]),
                __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
            exports: [
                __WEBPACK_IMPORTED_MODULE_2__placeholder__["a" /* CoreSplitViewPlaceholderPage */]
            ]
        })
    ], CorePlaceholderPageModule);
    return CorePlaceholderPageModule;
}());

//# sourceMappingURL=placeholder.module.js.map

/***/ }),

/***/ 1979:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreSplitViewPlaceholderPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
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
// Code based on https://github.com/martinpritchardelevate/ionic-split-pane-demo

var CoreSplitViewPlaceholderPage = /** @class */ (function () {
    function CoreSplitViewPlaceholderPage() {
        // Nothing to do.
    }
    CoreSplitViewPlaceholderPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'core-placeholder',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/components/split-view/placeholder/core-placeholder.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>&nbsp;</ion-title>\n    </ion-navbar>\n</ion-header>\n\n<ion-content>\n    <core-empty-box icon="arrow-dropleft" [message]="\'core.emptysplit\' | translate"></core-empty-box>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/components/split-view/placeholder/core-placeholder.html"*/,
        }),
        __metadata("design:paramtypes", [])
    ], CoreSplitViewPlaceholderPage);
    return CoreSplitViewPlaceholderPage;
}());

//# sourceMappingURL=placeholder.js.map

/***/ })

});
//# sourceMappingURL=50.js.map