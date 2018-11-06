webpackJsonp([42],{

/***/ 1862:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreCoursesMyCoursesPageModule", function() { return CoreCoursesMyCoursesPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__my_courses__ = __webpack_require__(1987);
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







var CoreCoursesMyCoursesPageModule = /** @class */ (function () {
    function CoreCoursesMyCoursesPageModule() {
    }
    CoreCoursesMyCoursesPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_3__my_courses__["a" /* CoreCoursesMyCoursesPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_6__components_components_module__["a" /* CoreCoursesComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_3__my_courses__["a" /* CoreCoursesMyCoursesPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], CoreCoursesMyCoursesPageModule);
    return CoreCoursesMyCoursesPageModule;
}());

//# sourceMappingURL=my-courses.module.js.map

/***/ }),

/***/ 1987:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreCoursesMyCoursesPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__providers_events__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_courses__ = __webpack_require__(40);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_helper__ = __webpack_require__(927);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__core_course_providers_helper__ = __webpack_require__(21);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__core_course_providers_options_delegate__ = __webpack_require__(107);
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
 * Page that displays the list of courses the user is enrolled in.
 */
var CoreCoursesMyCoursesPage = /** @class */ (function () {
    function CoreCoursesMyCoursesPage(navCtrl, coursesProvider, domUtils, eventsProvider, sitesProvider, courseHelper, courseOptionsDelegate, coursesHelper) {
        this.navCtrl = navCtrl;
        this.coursesProvider = coursesProvider;
        this.domUtils = domUtils;
        this.eventsProvider = eventsProvider;
        this.sitesProvider = sitesProvider;
        this.courseHelper = courseHelper;
        this.courseOptionsDelegate = courseOptionsDelegate;
        this.coursesHelper = coursesHelper;
        this.filter = '';
        this.showFilter = false;
        this.coursesLoaded = false;
        this.prefetchCoursesData = {};
        this.prefetchIconInitialized = false;
        this.isDestroyed = false;
        this.courseIds = '';
    }
    /**
     * View loaded.
     */
    CoreCoursesMyCoursesPage.prototype.ionViewDidLoad = function () {
        var _this = this;
        this.searchEnabled = !this.coursesProvider.isSearchCoursesDisabledInSite();
        this.downloadAllCoursesEnabled = !this.coursesProvider.isDownloadCoursesDisabledInSite();
        this.fetchCourses().finally(function () {
            _this.coursesLoaded = true;
        });
        this.myCoursesObserver = this.eventsProvider.on(__WEBPACK_IMPORTED_MODULE_5__providers_courses__["a" /* CoreCoursesProvider */].EVENT_MY_COURSES_UPDATED, function () {
            _this.fetchCourses();
        }, this.sitesProvider.getCurrentSiteId());
        // Refresh the enabled flags if site is updated.
        this.siteUpdatedObserver = this.eventsProvider.on(__WEBPACK_IMPORTED_MODULE_2__providers_events__["a" /* CoreEventsProvider */].SITE_UPDATED, function () {
            var wasEnabled = _this.downloadAllCoursesEnabled;
            _this.searchEnabled = !_this.coursesProvider.isSearchCoursesDisabledInSite();
            _this.downloadAllCoursesEnabled = !_this.coursesProvider.isDownloadCoursesDisabledInSite();
            if (!wasEnabled && _this.downloadAllCoursesEnabled && _this.coursesLoaded) {
                // Download all courses is enabled now, initialize it.
                _this.initPrefetchCoursesIcon();
            }
        }, this.sitesProvider.getCurrentSiteId());
    };
    /**
     * Fetch the user courses.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    CoreCoursesMyCoursesPage.prototype.fetchCourses = function () {
        var _this = this;
        return this.coursesProvider.getUserCourses().then(function (courses) {
            var promises = [], courseIds = courses.map(function (course) {
                return course.id;
            });
            _this.courseIds = courseIds.join(',');
            promises.push(_this.coursesHelper.loadCoursesExtraInfo(courses));
            if (_this.coursesProvider.canGetAdminAndNavOptions()) {
                promises.push(_this.coursesProvider.getCoursesAdminAndNavOptions(courseIds).then(function (options) {
                    courses.forEach(function (course) {
                        course.navOptions = options.navOptions[course.id];
                        course.admOptions = options.admOptions[course.id];
                    });
                }));
            }
            return Promise.all(promises).then(function () {
                _this.courses = courses;
                _this.filteredCourses = _this.courses;
                _this.filter = '';
                _this.initPrefetchCoursesIcon();
            });
        }).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error, 'core.courses.errorloadcourses', true);
        });
    };
    /**
     * Refresh the courses.
     *
     * @param {any} refresher Refresher.
     */
    CoreCoursesMyCoursesPage.prototype.refreshCourses = function (refresher) {
        var _this = this;
        var promises = [];
        promises.push(this.coursesProvider.invalidateUserCourses());
        promises.push(this.courseOptionsDelegate.clearAndInvalidateCoursesOptions());
        if (this.courseIds) {
            promises.push(this.coursesProvider.invalidateCoursesByField('ids', this.courseIds));
        }
        Promise.all(promises).finally(function () {
            _this.prefetchIconInitialized = false;
            _this.fetchCourses().finally(function () {
                refresher.complete();
            });
        });
    };
    /**
     * Show or hide the filter.
     */
    CoreCoursesMyCoursesPage.prototype.switchFilter = function () {
        var _this = this;
        this.filter = '';
        this.showFilter = !this.showFilter;
        this.filteredCourses = this.courses;
        if (this.showFilter) {
            setTimeout(function () {
                _this.searchbar.setFocus();
            }, 500);
        }
    };
    /**
     * Go to search courses.
     */
    CoreCoursesMyCoursesPage.prototype.openSearch = function () {
        this.navCtrl.push('CoreCoursesSearchPage');
    };
    /**
     * The filter has changed.
     *
     * @param {any} Received Event.
     */
    CoreCoursesMyCoursesPage.prototype.filterChanged = function (event) {
        var newValue = event.target.value && event.target.value.trim().toLowerCase();
        if (!newValue || !this.courses) {
            this.filteredCourses = this.courses;
        }
        else {
            this.filteredCourses = this.courses.filter(function (course) {
                return course.fullname.toLowerCase().indexOf(newValue) > -1;
            });
        }
    };
    /**
     * Prefetch all the courses.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    CoreCoursesMyCoursesPage.prototype.prefetchCourses = function () {
        var _this = this;
        var initialIcon = this.prefetchCoursesData.icon;
        this.prefetchCoursesData.icon = 'spinner';
        this.prefetchCoursesData.badge = '';
        return this.courseHelper.confirmAndPrefetchCourses(this.courses, function (progress) {
            _this.prefetchCoursesData.badge = progress.count + ' / ' + progress.total;
        }).then(function () {
            _this.prefetchCoursesData.icon = 'ion-android-refresh';
        }).catch(function (error) {
            if (!_this.isDestroyed) {
                _this.domUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
                _this.prefetchCoursesData.icon = initialIcon;
            }
        }).finally(function () {
            _this.prefetchCoursesData.badge = '';
        });
    };
    /**
     * Initialize the prefetch icon for the list of courses.
     */
    CoreCoursesMyCoursesPage.prototype.initPrefetchCoursesIcon = function () {
        var _this = this;
        if (this.prefetchIconInitialized || !this.downloadAllCoursesEnabled) {
            // Already initialized.
            return;
        }
        this.prefetchIconInitialized = true;
        if (!this.courses || this.courses.length < 2) {
            // Not enough courses.
            this.prefetchCoursesData.icon = '';
            return;
        }
        this.courseHelper.determineCoursesStatus(this.courses).then(function (status) {
            var icon = _this.courseHelper.getCourseStatusIconAndTitleFromStatus(status).icon;
            if (icon == 'spinner') {
                // It seems all courses are being downloaded, show a download button instead.
                icon = 'cloud-download';
            }
            _this.prefetchCoursesData.icon = icon;
        });
    };
    /**
     * Page destroyed.
     */
    CoreCoursesMyCoursesPage.prototype.ngOnDestroy = function () {
        this.isDestroyed = true;
        this.myCoursesObserver && this.myCoursesObserver.off();
        this.siteUpdatedObserver && this.siteUpdatedObserver.off();
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])('searchbar'),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["x" /* Searchbar */])
    ], CoreCoursesMyCoursesPage.prototype, "searchbar", void 0);
    CoreCoursesMyCoursesPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-courses-my-courses',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/courses/pages/my-courses/my-courses.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{ \'core.courses.mycourses\' | translate }}</ion-title>\n\n        <ion-buttons end>\n            <button *ngIf="searchEnabled" ion-button icon-only (click)="openSearch()" [attr.aria-label]="\'core.courses.searchcourses\' | translate">\n                <ion-icon name="search"></ion-icon>\n            </button>\n            <core-context-menu>\n                <core-context-menu-item [hidden]="!downloadAllCoursesEnabled || !courses || courses.length < 2" [priority]="800" [content]="\'core.courses.downloadcourses\' | translate" (action)="prefetchCourses()" [iconAction]="prefetchCoursesData.icon" [closeOnClick]="false" [badge]="prefetchCoursesData.badge"></core-context-menu-item>\n                <core-context-menu-item [hidden]="!courses || courses.length <= 5" [priority]="700" [content]="\'core.courses.filtermycourses\' | translate" (action)="switchFilter()" [iconAction]="\'funnel\'"></core-context-menu-item>\n            </core-context-menu>\n        </ion-buttons>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ion-refresher [enabled]="coursesLoaded" (ionRefresh)="refreshCourses($event)">\n        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n    </ion-refresher>\n\n    <core-loading [hideUntil]="coursesLoaded">\n        <ion-searchbar #searchbar *ngIf="showFilter" [(ngModel)]="filter" (ionInput)="filterChanged($event)" (ionCancel)="filterChanged()" [placeholder]="\'core.courses.filtermycourses\' | translate">\n        </ion-searchbar>\n        <ion-grid no-padding>\n            <ion-row no-padding>\n                <ion-col *ngFor="let course of filteredCourses" no-padding col-12 col-sm-6 col-md-6 col-lg-4 col-xl-4 align-self-stretch>\n                    <core-courses-course-progress [course]="course" class="core-courseoverview"></core-courses-course-progress>\n                </ion-col>\n            </ion-row>\n        </ion-grid>\n        <core-empty-box *ngIf="!courses || !courses.length" icon="ionic" [message]="\'core.courses.nocourses\' | translate">\n            <p *ngIf="searchEnabled">{{ \'core.courses.searchcoursesadvice\' | translate }}</p>\n        </core-empty-box>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/courses/pages/my-courses/my-courses.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */], __WEBPACK_IMPORTED_MODULE_5__providers_courses__["a" /* CoreCoursesProvider */],
            __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_2__providers_events__["a" /* CoreEventsProvider */],
            __WEBPACK_IMPORTED_MODULE_3__providers_sites__["a" /* CoreSitesProvider */], __WEBPACK_IMPORTED_MODULE_7__core_course_providers_helper__["a" /* CoreCourseHelperProvider */],
            __WEBPACK_IMPORTED_MODULE_8__core_course_providers_options_delegate__["a" /* CoreCourseOptionsDelegate */], __WEBPACK_IMPORTED_MODULE_6__providers_helper__["a" /* CoreCoursesHelperProvider */]])
    ], CoreCoursesMyCoursesPage);
    return CoreCoursesMyCoursesPage;
}());

//# sourceMappingURL=my-courses.js.map

/***/ })

});
//# sourceMappingURL=42.js.map