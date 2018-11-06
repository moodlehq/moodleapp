webpackJsonp([41],{

/***/ 1865:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreCoursesMyOverviewPageModule", function() { return CoreCoursesMyOverviewPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__my_overview__ = __webpack_require__(1990);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__components_components_module__ = __webpack_require__(923);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__core_sitehome_components_components_module__ = __webpack_require__(931);
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








var CoreCoursesMyOverviewPageModule = /** @class */ (function () {
    function CoreCoursesMyOverviewPageModule() {
    }
    CoreCoursesMyOverviewPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_3__my_overview__["a" /* CoreCoursesMyOverviewPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_6__components_components_module__["a" /* CoreCoursesComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_7__core_sitehome_components_components_module__["a" /* CoreSiteHomeComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_3__my_overview__["a" /* CoreCoursesMyOverviewPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], CoreCoursesMyOverviewPageModule);
    return CoreCoursesMyOverviewPageModule;
}());

//# sourceMappingURL=my-overview.module.js.map

/***/ }),

/***/ 1990:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreCoursesMyOverviewPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__providers_events__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_utils_utils__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_courses__ = __webpack_require__(40);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__providers_helper__ = __webpack_require__(927);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__providers_my_overview__ = __webpack_require__(253);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__core_course_providers_helper__ = __webpack_require__(21);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__core_course_providers_options_delegate__ = __webpack_require__(107);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__addon_coursecompletion_providers_coursecompletion__ = __webpack_require__(198);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12__core_sitehome_providers_sitehome__ = __webpack_require__(149);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13_moment__ = __webpack_require__(6);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13_moment___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_13_moment__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_14__components_tabs_tabs__ = __webpack_require__(135);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_15__core_sitehome_components_index_index__ = __webpack_require__(932);
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
 * Page that displays My Overview.
 */
var CoreCoursesMyOverviewPage = /** @class */ (function () {
    function CoreCoursesMyOverviewPage(navCtrl, coursesProvider, domUtils, myOverviewProvider, courseHelper, sitesProvider, siteHomeProvider, courseOptionsDelegate, eventsProvider, coursesHelper, utils, courseCompletionProvider) {
        this.navCtrl = navCtrl;
        this.coursesProvider = coursesProvider;
        this.domUtils = domUtils;
        this.myOverviewProvider = myOverviewProvider;
        this.courseHelper = courseHelper;
        this.sitesProvider = sitesProvider;
        this.siteHomeProvider = siteHomeProvider;
        this.courseOptionsDelegate = courseOptionsDelegate;
        this.eventsProvider = eventsProvider;
        this.coursesHelper = coursesHelper;
        this.utils = utils;
        this.courseCompletionProvider = courseCompletionProvider;
        this.tabsReady = false;
        this.tabShown = 'courses';
        this.timeline = {
            sort: 'sortbydates',
            events: [],
            loaded: false,
            canLoadMore: undefined
        };
        this.timelineCourses = {
            courses: [],
            loaded: false,
            canLoadMore: false
        };
        this.courses = {
            selected: 'inprogress',
            loaded: false,
            filter: '',
            past: [],
            inprogress: [],
            future: []
        };
        this.showFilter = false;
        this.tabs = [];
        this.prefetchCoursesData = {
            inprogress: {},
            past: {},
            future: {}
        };
        this.prefetchIconsInitialized = false;
        this.courseIds = '';
        this.loadSiteName();
    }
    /**
     * View loaded.
     */
    CoreCoursesMyOverviewPage.prototype.ionViewDidLoad = function () {
        var _this = this;
        this.searchEnabled = !this.coursesProvider.isSearchCoursesDisabledInSite();
        this.downloadAllCoursesEnabled = !this.coursesProvider.isDownloadCoursesDisabledInSite();
        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = this.eventsProvider.on(__WEBPACK_IMPORTED_MODULE_2__providers_events__["a" /* CoreEventsProvider */].SITE_UPDATED, function () {
            var wasEnabled = _this.downloadAllCoursesEnabled;
            _this.searchEnabled = !_this.coursesProvider.isSearchCoursesDisabledInSite();
            _this.downloadAllCoursesEnabled = !_this.coursesProvider.isDownloadCoursesDisabledInSite();
            if (!wasEnabled && _this.downloadAllCoursesEnabled && _this.courses.loaded) {
                // Download all courses is enabled now, initialize it.
                _this.initPrefetchCoursesIcons();
            }
            _this.loadSiteName();
        });
        // Decide which tab to load first.
        this.siteHomeProvider.isAvailable().then(function (enabled) {
            var site = _this.sitesProvider.getCurrentSite(), displaySiteHome = site.getInfo() && site.getInfo().userhomepage === 0;
            _this.siteHomeEnabled = enabled;
            _this.firstSelectedTab = displaySiteHome ? 0 : 1;
            _this.tabsReady = true;
        });
    };
    /**
     * User entered the page.
     */
    CoreCoursesMyOverviewPage.prototype.ionViewDidEnter = function () {
        this.tabsComponent && this.tabsComponent.ionViewDidEnter();
    };
    /**
     * User left the page.
     */
    CoreCoursesMyOverviewPage.prototype.ionViewDidLeave = function () {
        this.tabsComponent && this.tabsComponent.ionViewDidLeave();
    };
    /**
     * Fetch the timeline.
     *
     * @param {number} [afterEventId] The last event id.
     * @return {Promise<any>} Promise resolved when done.
     */
    CoreCoursesMyOverviewPage.prototype.fetchMyOverviewTimeline = function (afterEventId) {
        var _this = this;
        return this.myOverviewProvider.getActionEventsByTimesort(afterEventId).then(function (events) {
            _this.timeline.events = events.events;
            _this.timeline.canLoadMore = events.canLoadMore;
        }).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error, 'Error getting my overview data.');
        });
    };
    /**
     * Fetch the timeline by courses.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    CoreCoursesMyOverviewPage.prototype.fetchMyOverviewTimelineByCourses = function () {
        var _this = this;
        return this.fetchUserCourses().then(function (courses) {
            var today = __WEBPACK_IMPORTED_MODULE_13_moment__().unix();
            var courseIds;
            courses = courses.filter(function (course) {
                return course.startdate <= today && (!course.enddate || course.enddate >= today);
            });
            _this.timelineCourses.courses = courses;
            if (courses.length > 0) {
                courseIds = courses.map(function (course) {
                    return course.id;
                });
                return _this.myOverviewProvider.getActionEventsByCourses(courseIds).then(function (courseEvents) {
                    _this.timelineCourses.courses.forEach(function (course) {
                        course.events = courseEvents[course.id].events;
                        course.canLoadMore = courseEvents[course.id].canLoadMore;
                    });
                });
            }
        }).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error, 'Error getting my overview data.');
        });
    };
    /**
     * Fetch the courses for my overview.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    CoreCoursesMyOverviewPage.prototype.fetchMyOverviewCourses = function () {
        var _this = this;
        return this.fetchUserCourses().then(function (courses) {
            // Fetch course completion status.
            return Promise.all(courses.map(function (course) {
                if (typeof course.enablecompletion != 'undefined' && course.enablecompletion == 0) {
                    // Completion is disabled for this course, there is no need to fetch the completion status.
                    return Promise.resolve(course);
                }
                return _this.courseCompletionProvider.getCompletion(course.id).catch(function () {
                    // Ignore error, maybe course compleiton is disabled or user ha no permission.
                }).then(function (completion) {
                    course.completed = completion && completion.completed;
                    return course;
                });
            }));
        }).then(function (courses) {
            var today = __WEBPACK_IMPORTED_MODULE_13_moment__().unix();
            _this.courses.past = [];
            _this.courses.inprogress = [];
            _this.courses.future = [];
            courses.forEach(function (course) {
                if ((course.enddate && course.enddate < today) || course.completed) {
                    // Courses that have already ended.
                    _this.courses.past.push(course);
                }
                else if (course.startdate > today) {
                    // Courses that have not started yet.
                    _this.courses.future.push(course);
                }
                else {
                    // Courses still in progress.
                    _this.courses.inprogress.push(course);
                }
            });
            _this.courses.filter = '';
            _this.showFilter = false;
            _this.filteredCourses = _this.courses[_this.courses.selected];
            _this.initPrefetchCoursesIcons();
        }).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error, 'Error getting my overview data.');
        });
    };
    /**
     * Fetch user courses.
     *
     * @return {Promise<any[]>} Promise resolved when done.
     */
    CoreCoursesMyOverviewPage.prototype.fetchUserCourses = function () {
        var _this = this;
        return this.coursesProvider.getUserCourses().then(function (courses) {
            var promises = [], courseIds = courses.map(function (course) {
                return course.id;
            });
            if (_this.coursesProvider.canGetAdminAndNavOptions()) {
                // Load course options of the course.
                promises.push(_this.coursesProvider.getCoursesAdminAndNavOptions(courseIds).then(function (options) {
                    courses.forEach(function (course) {
                        course.navOptions = options.navOptions[course.id];
                        course.admOptions = options.admOptions[course.id];
                    });
                }));
            }
            _this.courseIds = courseIds.join(',');
            promises.push(_this.coursesHelper.loadCoursesExtraInfo(courses));
            return Promise.all(promises).then(function () {
                return courses.sort(function (a, b) {
                    var compareA = a.fullname.toLowerCase(), compareB = b.fullname.toLowerCase();
                    return compareA.localeCompare(compareB);
                });
            });
        });
    };
    /**
     * Show or hide the filter.
     */
    CoreCoursesMyOverviewPage.prototype.switchFilter = function () {
        var _this = this;
        this.showFilter = !this.showFilter;
        this.courses.filter = '';
        this.filteredCourses = this.courses[this.courses.selected];
        if (this.showFilter) {
            setTimeout(function () {
                _this.searchbar.setFocus();
            }, 500);
        }
    };
    /**
     * The filter has changed.
     *
     * @param {any} Received Event.
     */
    CoreCoursesMyOverviewPage.prototype.filterChanged = function (event) {
        var newValue = event.target.value && event.target.value.trim().toLowerCase();
        if (!newValue || !this.courses[this.courses.selected]) {
            this.filteredCourses = this.courses[this.courses.selected];
        }
        else {
            this.filteredCourses = this.courses[this.courses.selected].filter(function (course) {
                return course.fullname.toLowerCase().indexOf(newValue) > -1;
            });
        }
    };
    /**
     * Refresh the data.
     *
     * @param {any} refresher Refresher.
     * @return {Promise<any>} Promise resolved when done.
     */
    CoreCoursesMyOverviewPage.prototype.refreshMyOverview = function (refresher) {
        var _this = this;
        var promises = [];
        if (this.tabShown == 'timeline') {
            promises.push(this.myOverviewProvider.invalidateActionEventsByTimesort());
            promises.push(this.myOverviewProvider.invalidateActionEventsByCourses());
        }
        promises.push(this.coursesProvider.invalidateUserCourses().finally(function () {
            // Invalidate course completion data.
            return _this.coursesProvider.getUserCourses().then(function (courses) {
                return _this.utils.allPromises(courses.map(function (course) {
                    return _this.courseCompletionProvider.invalidateCourseCompletion(course.id);
                }));
            });
        }));
        promises.push(this.courseOptionsDelegate.clearAndInvalidateCoursesOptions());
        if (this.courseIds) {
            promises.push(this.coursesProvider.invalidateCoursesByField('ids', this.courseIds));
        }
        return this.utils.allPromises(promises).finally(function () {
            switch (_this.tabShown) {
                case 'timeline':
                    switch (_this.timeline.sort) {
                        case 'sortbydates':
                            return _this.fetchMyOverviewTimeline();
                        case 'sortbycourses':
                            return _this.fetchMyOverviewTimelineByCourses();
                        default:
                    }
                    break;
                case 'courses':
                    _this.prefetchIconsInitialized = false;
                    return _this.fetchMyOverviewCourses();
                default:
            }
        }).finally(function () {
            refresher.complete();
        });
    };
    /**
     * Change timeline sort being viewed.
     */
    CoreCoursesMyOverviewPage.prototype.switchSort = function () {
        var _this = this;
        switch (this.timeline.sort) {
            case 'sortbydates':
                if (!this.timeline.loaded) {
                    this.fetchMyOverviewTimeline().finally(function () {
                        _this.timeline.loaded = true;
                    });
                }
                break;
            case 'sortbycourses':
                if (!this.timelineCourses.loaded) {
                    this.fetchMyOverviewTimelineByCourses().finally(function () {
                        _this.timelineCourses.loaded = true;
                    });
                }
                break;
            default:
        }
    };
    /**
     * The tab has changed.
     *
     * @param {string} tab Name of the new tab.
     */
    CoreCoursesMyOverviewPage.prototype.tabChanged = function (tab) {
        var _this = this;
        this.tabShown = tab;
        switch (this.tabShown) {
            case 'timeline':
                if (!this.timeline.loaded) {
                    this.fetchMyOverviewTimeline().finally(function () {
                        _this.timeline.loaded = true;
                    });
                }
                break;
            case 'courses':
                if (!this.courses.loaded) {
                    this.fetchMyOverviewCourses().finally(function () {
                        _this.courses.loaded = true;
                    });
                }
                break;
            default:
        }
    };
    /**
     * Load more events.
     */
    CoreCoursesMyOverviewPage.prototype.loadMoreTimeline = function () {
        return this.fetchMyOverviewTimeline(this.timeline.canLoadMore);
    };
    /**
     * Load more events.
     *
     * @param {any} course Course.
     * @return {Promise<any>} Promise resolved when done.
     */
    CoreCoursesMyOverviewPage.prototype.loadMoreCourse = function (course) {
        return this.myOverviewProvider.getActionEventsByCourse(course.id, course.canLoadMore).then(function (courseEvents) {
            course.events = course.events.concat(courseEvents.events);
            course.canLoadMore = courseEvents.canLoadMore;
        });
    };
    /**
     * Go to search courses.
     */
    CoreCoursesMyOverviewPage.prototype.openSearch = function () {
        this.navCtrl.push('CoreCoursesSearchPage');
    };
    /**
     * The selected courses have changed.
     */
    CoreCoursesMyOverviewPage.prototype.selectedChanged = function () {
        this.filteredCourses = this.courses[this.courses.selected];
    };
    /**
     * Prefetch all the shown courses.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    CoreCoursesMyOverviewPage.prototype.prefetchCourses = function () {
        var _this = this;
        var selected = this.courses.selected, selectedData = this.prefetchCoursesData[selected], initialIcon = selectedData.icon;
        selectedData.icon = 'spinner';
        selectedData.badge = '';
        return this.courseHelper.confirmAndPrefetchCourses(this.courses[selected], function (progress) {
            selectedData.badge = progress.count + ' / ' + progress.total;
        }).then(function () {
            selectedData.icon = 'refresh';
        }).catch(function (error) {
            if (!_this.isDestroyed) {
                _this.domUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
                selectedData.icon = initialIcon;
            }
        }).finally(function () {
            selectedData.badge = '';
        });
    };
    /**
     * Initialize the prefetch icon for selected courses.
     */
    CoreCoursesMyOverviewPage.prototype.initPrefetchCoursesIcons = function () {
        var _this = this;
        if (this.prefetchIconsInitialized || !this.downloadAllCoursesEnabled) {
            // Already initialized.
            return;
        }
        this.prefetchIconsInitialized = true;
        Object.keys(this.prefetchCoursesData).forEach(function (filter) {
            if (!_this.courses[filter] || _this.courses[filter].length < 2) {
                // Not enough courses.
                _this.prefetchCoursesData[filter].icon = '';
                return;
            }
            _this.courseHelper.determineCoursesStatus(_this.courses[filter]).then(function (status) {
                var icon = _this.courseHelper.getCourseStatusIconAndTitleFromStatus(status).icon;
                if (icon == 'spinner') {
                    // It seems all courses are being downloaded, show a download button instead.
                    icon = 'cloud-download';
                }
                _this.prefetchCoursesData[filter].icon = icon;
            });
        });
    };
    /**
     * Load the site name.
     */
    CoreCoursesMyOverviewPage.prototype.loadSiteName = function () {
        this.siteName = this.sitesProvider.getCurrentSite().getInfo().sitename;
    };
    /**
     * Component being destroyed.
     */
    CoreCoursesMyOverviewPage.prototype.ngOnDestroy = function () {
        this.isDestroyed = true;
        this.updateSiteObserver && this.updateSiteObserver.off();
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])(__WEBPACK_IMPORTED_MODULE_14__components_tabs_tabs__["a" /* CoreTabsComponent */]),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_14__components_tabs_tabs__["a" /* CoreTabsComponent */])
    ], CoreCoursesMyOverviewPage.prototype, "tabsComponent", void 0);
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])('searchbar'),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["x" /* Searchbar */])
    ], CoreCoursesMyOverviewPage.prototype, "searchbar", void 0);
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])(__WEBPACK_IMPORTED_MODULE_15__core_sitehome_components_index_index__["a" /* CoreSiteHomeIndexComponent */]),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_15__core_sitehome_components_index_index__["a" /* CoreSiteHomeIndexComponent */])
    ], CoreCoursesMyOverviewPage.prototype, "siteHomeComponent", void 0);
    CoreCoursesMyOverviewPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-courses-my-overview',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/courses/pages/my-overview/my-overview.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title><core-format-text [text]="siteName"></core-format-text></ion-title>\n\n        <ion-buttons end>\n            <button *ngIf="tabShown == \'courses\' && courses[courses.selected] && courses[courses.selected].length > 5" ion-button icon-only [attr.aria-label]="\'core.courses.filtermycourses\' | translate" (click)="switchFilter()">\n                <ion-icon name="funnel"></ion-icon>\n            </button>\n            <button *ngIf="searchEnabled" ion-button icon-only (click)="openSearch()" [attr.aria-label]="\'core.courses.searchcourses\' | translate">\n                <ion-icon name="search"></ion-icon>\n            </button>\n        </ion-buttons>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <core-tabs [selectedIndex]="firstSelectedTab" [hideUntil]="tabsReady">\n        <!-- Site home tab. -->\n        <core-tab [show]="siteHomeEnabled" [title]="\'core.sitehome.sitehome\' | translate" (ionSelect)="tabChanged(\'sitehome\')">\n            <ng-template>\n                <ion-content>\n                    <ion-refresher [enabled]="siteHomeComponent && siteHomeComponent.dataLoaded" (ionRefresh)="siteHomeComponent.doRefresh($event)">\n                        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n                    </ion-refresher>\n                    <core-sitehome-index></core-sitehome-index>\n                </ion-content>\n            </ng-template>\n        </core-tab>\n\n        <!-- Courses tab. -->\n        <core-tab [title]="\'core.courses.courses\' | translate" (ionSelect)="tabChanged(\'courses\')">\n            <ng-template>\n                <ion-content>\n                    <ion-refresher [enabled]="timeline.loaded || timelineCourses.loaded || courses.loaded" (ionRefresh)="refreshMyOverview($event)">\n                        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n                    </ion-refresher>\n\n                    <core-loading [hideUntil]="courses.loaded" class="core-loading-center">\n                        <!-- "Time" selector. -->\n                        <div padding class="clearfix" [hidden]="showFilter" ion-row justify-content-between>\n                            <ion-select float-start [title]="\'core.show\' | translate" [(ngModel)]="courses.selected" ion-col (ngModelChange)="selectedChanged()" interface="popover" class="core-button-select">\n                                <ion-option value="inprogress">{{ \'core.courses.inprogress\' | translate }}</ion-option>\n                                <ion-option value="future">{{ \'core.courses.future\' | translate }}</ion-option>\n                                <ion-option value="past">{{ \'core.courses.past\' | translate }}</ion-option>\n                            </ion-select>\n                            <!-- Download all courses. -->\n                            <div *ngIf="downloadAllCoursesEnabled && courses[courses.selected] && courses[courses.selected].length > 1" class="core-button-spinner">\n                                <button *ngIf="prefetchCoursesData[courses.selected].icon && prefetchCoursesData[courses.selected].icon != \'spinner\'" ion-button icon-only clear color="dark" (click)="prefetchCourses()">\n                                    <core-icon [name]="prefetchCoursesData[courses.selected].icon"></core-icon>\n                                </button>\n                                <ion-badge class="core-course-download-courses-progress" *ngIf="prefetchCoursesData[courses.selected].badge">{{prefetchCoursesData[courses.selected].badge}}</ion-badge>\n                                <ion-spinner *ngIf="!prefetchCoursesData[courses.selected].icon || prefetchCoursesData[courses.selected].icon == \'spinner\'"></ion-spinner>\n                            </div>\n                        </div>\n                        <core-empty-box *ngIf="courses[courses.selected].length == 0 && courses.selected == \'inprogress\'" image="assets/img/icons/courses.svg" [message]="\'core.courses.nocoursesinprogress\' | translate"></core-empty-box>\n                        <core-empty-box *ngIf="courses[courses.selected].length == 0 && courses.selected == \'future\'" image="assets/img/icons/courses.svg" [message]="\'core.courses.nocoursesfuture\' | translate"></core-empty-box>\n                        <core-empty-box *ngIf="courses[courses.selected].length == 0 && courses.selected == \'past\'" image="assets/img/icons/courses.svg" [message]="\'core.courses.nocoursespast\' | translate"></core-empty-box>\n\n                        <!-- Filter courses. -->\n                        <ion-searchbar #searchbar *ngIf="showFilter" [(ngModel)]="courses.filter" (ionInput)="filterChanged($event)" (ionCancel)="filterChanged()" [placeholder]="\'core.courses.filtermycourses\' | translate">\n                        </ion-searchbar>\n                        <!-- List of courses. -->\n                        <div>\n                            <ion-grid no-padding>\n                                <ion-row no-padding>\n                                    <ion-col *ngFor="let course of filteredCourses" no-padding col-12 col-sm-6 col-md-6 col-lg-4 col-xl-4 align-self-stretch>\n                                        <core-courses-course-progress [course]="course" class="core-courseoverview"></core-courses-course-progress>\n                                    </ion-col>\n                                </ion-row>\n                            </ion-grid>\n                        </div>\n                    </core-loading>\n                </ion-content>\n            </ng-template>\n        </core-tab>\n\n        <!-- Timeline tab. -->\n        <core-tab [title]="\'core.courses.timeline\' | translate" (ionSelect)="tabChanged(\'timeline\')">\n            <ng-template>\n                <ion-content>\n                    <ion-refresher [enabled]="timeline.loaded || timelineCourses.loaded || courses.loaded" (ionRefresh)="refreshMyOverview($event)">\n                        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n                    </ion-refresher>\n\n                    <div padding [hidden]="!(timeline.loaded || timelineCourses.loaded)">\n                        <ion-select [(ngModel)]="timeline.sort" (ngModelChange)="switchSort()" interface="popover" class="core-button-select">\n                            <ion-option value="sortbydates">{{ \'core.courses.sortbydates\' | translate }}</ion-option>\n                            <ion-option value="sortbycourses">{{ \'core.courses.sortbycourses\' | translate }}</ion-option>\n                        </ion-select>\n                    </div>\n                    <core-loading [hideUntil]="timeline.loaded" [hidden]="timeline.sort != \'sortbydates\'" class="core-loading-center">\n                        <core-courses-overview-events [events]="timeline.events" showCourse="true" [canLoadMore]="timeline.canLoadMore" (loadMore)="loadMoreTimeline()"></core-courses-overview-events>\n                    </core-loading>\n                    <core-loading [hideUntil]="timelineCourses.loaded" [hidden]="timeline.sort != \'sortbycourses\'" class="core-loading-center">\n                        <ion-grid no-padding>\n                            <ion-row no-padding>\n                                <ion-col *ngFor="let course of timelineCourses.courses" no-padding col-12 col-md-6>\n                                    <core-courses-course-progress [course]="course">\n                                        <core-courses-overview-events [events]="course.events" [canLoadMore]="course.canLoadMore" (loadMore)="loadMoreCourse(course)"></core-courses-overview-events>\n                                    </core-courses-course-progress>\n                                </ion-col>\n                            </ion-row>\n                        </ion-grid>\n                        <core-empty-box *ngIf="timelineCourses.courses.length == 0" image="assets/img/icons/courses.svg" [message]="\'core.courses.nocoursesoverview\' | translate"></core-empty-box>\n                    </core-loading>\n                </ion-content>\n            </ng-template>\n        </core-tab>\n    </core-tabs>\n</ion-content>'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/courses/pages/my-overview/my-overview.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */], __WEBPACK_IMPORTED_MODULE_6__providers_courses__["a" /* CoreCoursesProvider */],
            __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_8__providers_my_overview__["a" /* CoreCoursesMyOverviewProvider */],
            __WEBPACK_IMPORTED_MODULE_9__core_course_providers_helper__["a" /* CoreCourseHelperProvider */], __WEBPACK_IMPORTED_MODULE_3__providers_sites__["a" /* CoreSitesProvider */],
            __WEBPACK_IMPORTED_MODULE_12__core_sitehome_providers_sitehome__["a" /* CoreSiteHomeProvider */], __WEBPACK_IMPORTED_MODULE_10__core_course_providers_options_delegate__["a" /* CoreCourseOptionsDelegate */],
            __WEBPACK_IMPORTED_MODULE_2__providers_events__["a" /* CoreEventsProvider */], __WEBPACK_IMPORTED_MODULE_7__providers_helper__["a" /* CoreCoursesHelperProvider */],
            __WEBPACK_IMPORTED_MODULE_5__providers_utils_utils__["a" /* CoreUtilsProvider */], __WEBPACK_IMPORTED_MODULE_11__addon_coursecompletion_providers_coursecompletion__["a" /* AddonCourseCompletionProvider */]])
    ], CoreCoursesMyOverviewPage);
    return CoreCoursesMyOverviewPage;
}());

//# sourceMappingURL=my-overview.js.map

/***/ })

});
//# sourceMappingURL=41.js.map