webpackJsonp([114],{

/***/ 1783:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddonCalendarEventPageModule", function() { return AddonCalendarEventPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__pipes_pipes_module__ = __webpack_require__(67);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__event__ = __webpack_require__(1904);
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







var AddonCalendarEventPageModule = /** @class */ (function () {
    function AddonCalendarEventPageModule() {
    }
    AddonCalendarEventPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_6__event__["a" /* AddonCalendarEventPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_3__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_5__pipes_pipes_module__["a" /* CorePipesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_6__event__["a" /* AddonCalendarEventPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], AddonCalendarEventPageModule);
    return AddonCalendarEventPageModule;
}());

//# sourceMappingURL=event.module.js.map

/***/ }),

/***/ 1904:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AddonCalendarEventPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_calendar__ = __webpack_require__(247);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_helper__ = __webpack_require__(926);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__core_courses_providers_courses__ = __webpack_require__(40);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__providers_local_notifications__ = __webpack_require__(80);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__core_course_providers_course__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__providers_utils_time__ = __webpack_require__(22);
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
 * Page that displays a single calendar event.
 */
var AddonCalendarEventPage = /** @class */ (function () {
    function AddonCalendarEventPage(translate, calendarProvider, navParams, domUtils, coursesProvider, timeUtils, calendarHelper, sitesProvider, localNotificationsProvider, courseProvider) {
        var _this = this;
        this.translate = translate;
        this.calendarProvider = calendarProvider;
        this.domUtils = domUtils;
        this.coursesProvider = coursesProvider;
        this.calendarHelper = calendarHelper;
        this.courseProvider = courseProvider;
        this.event = {};
        this.notificationsEnabled = false;
        this.eventId = navParams.get('id');
        this.notificationsEnabled = localNotificationsProvider.isAvailable();
        this.siteHomeId = sitesProvider.getCurrentSite().getSiteHomeId();
        if (this.notificationsEnabled) {
            this.calendarProvider.getEventNotificationTimeOption(this.eventId).then(function (notificationTime) {
                _this.notificationTime = notificationTime;
            });
            this.calendarProvider.getDefaultNotificationTime().then(function (defaultTime) {
                if (defaultTime === 0) {
                    // Disabled by default.
                    _this.defaultTimeReadable = _this.translate.instant('core.settings.disabled');
                }
                else {
                    _this.defaultTimeReadable = timeUtils.formatTime(defaultTime * 60);
                }
            });
        }
    }
    /**
     * View loaded.
     */
    AddonCalendarEventPage.prototype.ionViewDidLoad = function () {
        var _this = this;
        this.fetchEvent().finally(function () {
            _this.eventLoaded = true;
        });
    };
    AddonCalendarEventPage.prototype.updateNotificationTime = function () {
        if (!isNaN(this.notificationTime) && this.event && this.event.id) {
            this.calendarProvider.updateNotificationTime(this.event, this.notificationTime);
        }
    };
    /**
     * Fetches the event and updates the view.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonCalendarEventPage.prototype.fetchEvent = function () {
        var _this = this;
        return this.calendarProvider.getEvent(this.eventId).then(function (event) {
            _this.calendarHelper.formatEventData(event);
            _this.event = event;
            // Guess event title.
            var title = _this.translate.instant('addon.calendar.type' + event.eventtype);
            if (event.moduleIcon) {
                // It's a module event, translate the module name to the current language.
                var name_1 = _this.courseProvider.translateModuleName(event.modulename);
                if (name_1.indexOf('core.mod_') === -1) {
                    event.moduleName = name_1;
                }
                if (title == 'addon.calendar.type' + event.eventtype) {
                    title = _this.translate.instant('core.mod_' + event.modulename + '.' + event.eventtype);
                    if (title == 'core.mod_' + event.modulename + '.' + event.eventtype) {
                        title = name_1;
                    }
                }
            }
            else {
                if (title == 'addon.calendar.type' + event.eventtype) {
                    title = event.name;
                }
            }
            _this.title = title;
            if (event.courseid && event.courseid != _this.siteHomeId) {
                // It's a course event, retrieve the course name.
                return _this.coursesProvider.getUserCourse(event.courseid, true).then(function (course) {
                    _this.courseName = course.fullname;
                });
            }
        }).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevent', true);
        });
    };
    /**
     * Refresh the event.
     *
     * @param {any} refresher Refresher.
     */
    AddonCalendarEventPage.prototype.refreshEvent = function (refresher) {
        var _this = this;
        this.calendarProvider.invalidateEvent(this.eventId).finally(function () {
            _this.fetchEvent().finally(function () {
                refresher.complete();
            });
        });
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])(__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */]),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */])
    ], AddonCalendarEventPage.prototype, "content", void 0);
    AddonCalendarEventPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-addon-calendar-event',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/addon/calendar/pages/event/event.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title><core-format-text [text]="title"></core-format-text></ion-title>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ion-refresher [enabled]="eventLoaded" (ionRefresh)="refreshEvent($event)">\n        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n    </ion-refresher>\n    <core-loading [hideUntil]="eventLoaded">\n        <ion-card>\n            <ion-card-content>\n                <ion-card-title text-wrap>\n                    <core-icon *ngIf="event.icon && !event.moduleIcon" [name]="event.icon" item-start></core-icon>\n                    <core-format-text [text]="event.name"></core-format-text>\n                </ion-card-title>\n                <ion-item text-wrap>\n                    <h2>{{ \'addon.calendar.eventstarttime\' | translate}}</h2>\n                    <p>{{ event.timestart | coreToLocaleString }}</p>\n                </ion-item>\n                <ion-item text-wrap *ngIf="event.timeduration > 0">\n                    <h2>{{ \'addon.calendar.eventendtime\' | translate}}</h2>\n                    <p>{{ (event.timestart + event.timeduration) |  coreToLocaleString }}</p>\n                </ion-item>\n                <ion-item text-wrap *ngIf="courseName">\n                    <h2>{{ \'core.course\' | translate}}</h2>\n                    <p><core-format-text [text]="courseName"></core-format-text></p>\n                </ion-item>\n                <ion-item text-wrap *ngIf="event.moduleIcon">\n                    <img *ngIf="event.moduleIcon" src="{{event.moduleIcon}}" item-start alt="" role="presentation" class="core-module-icon"> {{event.moduleName}}\n                </ion-item>\n                <ion-item>\n                    <p text-wrap *ngIf="event.description">\n                        <core-format-text [text]="event.description"></core-format-text>\n                    </p>\n                </ion-item>\n            </ion-card-content>\n        </ion-card>\n\n        <ion-card list *ngIf="notificationsEnabled">\n            <ion-item>\n                <ion-label>{{ \'addon.calendar.notifications\' | translate }}</ion-label>\n                <ion-select [(ngModel)]="notificationTime" (ionChange)="updateNotificationTime($event)" interface="popover">\n                    <ion-option value="-1">{{ \'core.defaultvalue\' | translate :{$a: defaultTimeReadable} }}</ion-option>\n                    <ion-option value="0">{{ \'core.settings.disabled\' | translate }}</ion-option>\n                    <ion-option value="10">{{ 600 | coreDuration }}</ion-option>\n                    <ion-option value="30">{{ 1800 | coreDuration }}</ion-option>\n                    <ion-option value="60">{{ 3600 | coreDuration }}</ion-option>\n                    <ion-option value="120">{{ 7200 | coreDuration }}</ion-option>\n                    <ion-option value="360">{{ 21600 | coreDuration }}</ion-option>\n                    <ion-option value="720">{{ 43200 | coreDuration }}</ion-option>\n                    <ion-option value="1440">{{ 86400 | coreDuration }}</ion-option>\n                </ion-select>\n            </ion-item>\n        </ion-card>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/addon/calendar/pages/event/event.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["c" /* TranslateService */], __WEBPACK_IMPORTED_MODULE_3__providers_calendar__["a" /* AddonCalendarProvider */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */],
            __WEBPACK_IMPORTED_MODULE_6__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_5__core_courses_providers_courses__["a" /* CoreCoursesProvider */], __WEBPACK_IMPORTED_MODULE_10__providers_utils_time__["a" /* CoreTimeUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_4__providers_helper__["a" /* AddonCalendarHelperProvider */], __WEBPACK_IMPORTED_MODULE_7__providers_sites__["a" /* CoreSitesProvider */],
            __WEBPACK_IMPORTED_MODULE_8__providers_local_notifications__["a" /* CoreLocalNotificationsProvider */], __WEBPACK_IMPORTED_MODULE_9__core_course_providers_course__["a" /* CoreCourseProvider */]])
    ], AddonCalendarEventPage);
    return AddonCalendarEventPage;
}());

//# sourceMappingURL=event.js.map

/***/ })

});
//# sourceMappingURL=114.js.map