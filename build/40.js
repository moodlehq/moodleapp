webpackJsonp([40],{

/***/ 1863:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreCoursesSearchPageModule", function() { return CoreCoursesSearchPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__search__ = __webpack_require__(1988);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__components_components_module__ = __webpack_require__(923);
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







var CoreCoursesSearchPageModule = /** @class */ (function () {
    function CoreCoursesSearchPageModule() {
    }
    CoreCoursesSearchPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_3__search__["a" /* CoreCoursesSearchPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_6__components_components_module__["a" /* CoreCoursesComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_3__search__["a" /* CoreCoursesSearchPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], CoreCoursesSearchPageModule);
    return CoreCoursesSearchPageModule;
}());

//# sourceMappingURL=search.module.js.map

/***/ }),

/***/ 1988:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreCoursesSearchPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__providers_courses__ = __webpack_require__(40);
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
 * Page that allows searching for courses.
 */
var CoreCoursesSearchPage = /** @class */ (function () {
    function CoreCoursesSearchPage(domUtils, coursesProvider) {
        this.domUtils = domUtils;
        this.coursesProvider = coursesProvider;
        this.total = 0;
        this.page = 0;
        this.currentSearch = '';
    }
    /**
     * Search a new text.
     *
     * @param {string} text The text to search.
     */
    CoreCoursesSearchPage.prototype.search = function (text) {
        this.currentSearch = text;
        this.courses = undefined;
        this.page = 0;
        var modal = this.domUtils.showModalLoading('core.searching', true);
        this.searchCourses().finally(function () {
            modal.dismiss();
        });
    };
    /**
     * Load more results.
     *
     * @param {any} infiniteScroll The infinit scroll instance.
     */
    CoreCoursesSearchPage.prototype.loadMoreResults = function (infiniteScroll) {
        this.searchCourses().finally(function () {
            infiniteScroll.complete();
        });
    };
    /**
     * Search courses or load the next page of current search.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    CoreCoursesSearchPage.prototype.searchCourses = function () {
        var _this = this;
        return this.coursesProvider.search(this.currentSearch, this.page).then(function (response) {
            if (_this.page === 0) {
                _this.courses = response.courses;
            }
            else {
                _this.courses = _this.courses.concat(response.courses);
            }
            _this.total = response.total;
            _this.page++;
            _this.canLoadMore = _this.courses.length < _this.total;
        }).catch(function (error) {
            _this.canLoadMore = false;
            _this.domUtils.showErrorModalDefault(error, 'core.courses.errorsearching', true);
        });
    };
    CoreCoursesSearchPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-courses-search',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/courses/pages/search/search.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{ \'core.courses.searchcourses\' | translate }}</ion-title>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <core-search-box (onSubmit)="search($event)" [placeholder]="\'core.courses.search\' | translate" [searchLabel]="\'core.courses.search\' | translate" autoFocus="true" showClear="false"></core-search-box>\n\n    <div *ngIf="courses">\n        <ion-item-divider color="light">{{ \'core.courses.totalcoursesearchresults\' | translate:{$a: total} }}</ion-item-divider>\n        <core-empty-box *ngIf="total == 0" icon="search" [message]="\'core.courses.nosearchresults\' | translate"></core-empty-box>\n        <core-courses-course-list-item *ngFor="let course of courses" [course]="course"></core-courses-course-list-item>\n        <ion-infinite-scroll [enabled]="canLoadMore" (ionInfinite)="loadMoreResults($event)">\n            <ion-infinite-scroll-content></ion-infinite-scroll-content>\n        </ion-infinite-scroll>\n    </div>\n</ion-content>\n\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/courses/pages/search/search.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_2__providers_courses__["a" /* CoreCoursesProvider */]])
    ], CoreCoursesSearchPage);
    return CoreCoursesSearchPage;
}());

//# sourceMappingURL=search.js.map

/***/ })

});
//# sourceMappingURL=40.js.map